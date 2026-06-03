// js/admin-devices.js
// Admin UI for managing offline_devices - Sync Supabase + IndexedDB

async function loadAdminDevices() {
  const currentRole = window.currentUserRole || window.currentRole;
  if (!currentRole || currentRole !== 'admin') return;

  const container = document.getElementById('adminDevicesContainer');
  if (!container) return;

  container.innerHTML = '<p>Memuat daftar perangkat...</p>';

  try {
    let devices = [];
    
    // Coba ambil dari Supabase dulu jika online
    if (navigator.onLine && window.sb) {
      try {
        const { data: supabaseDevices, error } = await sb.from('offline_devices')
          .select('id,device_id,device_name,device_type,device_model,allowed,created_at,updated_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        
        if (supabaseDevices && supabaseDevices.length > 0) {
          devices = supabaseDevices;
          
          // Simpan ke IndexedDB untuk offline
          for (const d of devices) {
            await window.localDB.save('offline_devices', d, d.device_id);
          }
          console.log('[DEVICES] Synced', devices.length, 'devices from Supabase to IndexedDB');
        }
      } catch (supabaseErr) {
        console.warn('[DEVICES] Supabase gagal, fallback ke IndexedDB:', supabaseErr.message);
      }
    }
    
    // Jika tidak ada data dari Supabase, ambil dari IndexedDB
    if (devices.length === 0) {
      devices = await window.localDB.getAll('offline_devices') || [];
      console.log('[DEVICES] Loaded', devices.length, 'devices from IndexedDB');
    }

    if (!devices || devices.length === 0) {
      container.innerHTML = '<p>Tidak ada perangkat terdaftar.</p>';
      return;
    }

    let html = '<table class="table"><thead><tr><th>Device ID</th><th>Name</th><th>Type</th><th>Model</th><th>Allowed</th><th>Created</th><th>Updated</th><th>Actions</th></tr></thead><tbody>';
    for (const d of devices) {
      const typeIcon = d.device_type === 'smartphone' ? '📱' : d.device_type === 'tablet' ? '📲' : d.device_type === 'laptop' ? '💻' : '🖥️';
      const typeLabel = d.device_type === 'smartphone' ? 'Smartphone' : d.device_type === 'tablet' ? 'Tablet' : d.device_type === 'laptop' ? 'Laptop' : 'Desktop';
      html += `<tr data-id="${d.device_id}"><td>${escapeHtml(d.device_id)}</td><td>${escapeHtml(d.device_name||'')}</td><td>${typeIcon} ${typeLabel}</td><td>${escapeHtml(d.device_model||'')}</td><td>${d.allowed? 'Yes':'No'}</td><td>${escapeHtml(d.created_at||'')}</td><td>${escapeHtml(d.updated_at||'')}</td><td>`;
      html += `<button class="btn btn-sm admin-device-action ${d.allowed ? 'revoke' : 'approve'}" onclick="toggleDeviceAllowed('${d.device_id}', ${d.allowed? 'false':'true'})">${d.allowed? 'Revoke':'Approve'}</button> `;
      html += `<button class="btn btn-sm admin-device-action delete" onclick="deleteDevice('${d.device_id}')">Delete</button>`;
      html += '</td></tr>';
    }
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    console.error('Load admin devices error:', err);
    container.innerHTML = '<p class="text-danger">Gagal memuat perangkat.</p>';
  }
}

async function toggleDeviceAllowed(deviceId, setAllowed) {
  try {
    const updates = { allowed: setAllowed, updated_at: new Date().toISOString() };
    
    // Update di Supabase jika online
    if (navigator.onLine && window.sb) {
      const { error } = await sb.from('offline_devices').update(updates).eq('device_id', deviceId);
      if (error) throw error;
    }
    
    // Update di IndexedDB juga
    const existing = await window.localDB.getById('offline_devices', deviceId);
    if (existing) {
      await window.localDB.save('offline_devices', { ...existing, ...updates }, deviceId);
    }
    
    await loadAdminDevices();
  } catch (err) {
    console.error('Toggle device allowed error:', err);
    alert('Gagal mengubah status perangkat');
  }
}

async function deleteDevice(deviceId) {
  const result = await Swal.fire({
    title: 'Hapus perangkat?',
    text: 'Perangkat akan dihapus secara permanen dari daftar.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, hapus',
    cancelButtonText: 'Batal',
    reverseButtons: true
  });
  if (!result.isConfirmed) return;

  try {
    // Hapus dari Supabase jika online
    if (navigator.onLine && window.sb) {
      const { error } = await sb.from('offline_devices').delete().eq('device_id', deviceId);
      if (error) throw error;
    }
    
    // Hapus dari IndexedDB juga
    await window.localDB.delete('offline_devices', deviceId);
    
    await loadAdminDevices();
    Swal.fire({
      icon: 'success',
      title: 'Terhapus',
      text: 'Perangkat berhasil dihapus.',
      timer: 1400,
      showConfirmButton: false
    });
  } catch (err) {
    console.error('Delete device error:', err);
    Swal.fire({
      icon: 'error',
      title: 'Gagal',
      text: 'Tidak dapat menghapus perangkat saat ini.',
      confirmButtonText: 'Tutup'
    });
  }
}

// Expose for inline onclick handlers
window.loadAdminDevices = loadAdminDevices;
window.toggleDeviceAllowed = toggleDeviceAllowed;
window.deleteDevice = deleteDevice;

async function showAdminDevicesPage() {
  const currentRole = window.currentUserRole || window.currentRole;
  if (!currentRole || currentRole !== 'admin') {
    Swal.fire({
      icon: 'warning',
      title: 'Akses Ditolak',
      text: 'Hanya admin yang dapat membuka halaman ini.',
      confirmButtonText: 'Tutup'
    });
    return;
  }

  setActiveMenu('admin-devices');
  document.getElementById('pageTitle').innerHTML = '<i class="fas fa-desktop"></i> Manajemen Perangkat';

  document.getElementById('content').innerHTML =
    '<div class="card admin-devices-page">' +
      '<div class="admin-devices-header">' +
        '<div>' +
          '<h3>Manajemen Perangkat</h3>' +
          '<p class="subtitle">Kelola perangkat offline yang terdaftar dan kontrol aksesnya.</p>' +
        '</div>' +
        '<button class="btn btn-sm admin-device-close-btn" onclick="loadDashboard()">Kembali</button>' +
      '</div>' +
      '<div id="adminDevicesContainer" style="margin-top:18px;"></div>' +
    '</div>';

  await loadAdminDevices();
}

window.showAdminDevicesPage = showAdminDevicesPage;
window.showAdminDevicesPanel = showAdminDevicesPage;

console.log('Admin devices module loaded');
