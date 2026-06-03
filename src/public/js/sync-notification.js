// js/sync-notification.js - Sinkronisasi Data untuk Komputer Offline

class SyncNotification {
  constructor() {
    this.lastSyncCheck = null;
    this.syncInterval = null;
    this.isOnline = navigator.onLine;
  }

  // ==================== CEK PERUBAHAN DATA ====================
  async checkForUpdates() {
    if (!navigator.onLine) {
      console.log('📡 Offline, tidak bisa cek update');
      return { hasUpdates: false };
    }

    try {
      console.log('🔍 Checking for database updates...');
      
      const isOfflineDevice = window.auth && window.auth.canUseOfflineMode();
      const lastSyncProduk = localStorage.getItem('last_sync_produk') || new Date(0).toISOString();
      const lastSyncKelas = localStorage.getItem('last_sync_kelas') || new Date(0).toISOString();
      const lastSyncTransaksi = localStorage.getItem('last_sync_transaksi') || new Date(0).toISOString();
      
      let produkBaru = [];
      let kelasBaru = [];
      let transaksiBaru = [];

      if (isOfflineDevice) {
        // ===== OFFLINE-CAPABLE: Bandingkan data LOKAL vs SERVER =====
        try {
          const localProduk = await window.localDB.getAll('produk') || [];
          const { data: serverProduk } = await sb.from('produk').select('id, nama, stok, harga_beli, harga_jual, updated_at');
          if (serverProduk && serverProduk.length > localProduk.length) {
            produkBaru = serverProduk.filter(sp => {
              const local = localProduk.find(lp => lp.id === sp.id);
              return !local || local.stok !== sp.stok || local.harga_beli !== sp.harga_beli || local.harga_jual !== sp.harga_jual;
            });
          }
        } catch(e) { console.error('Produk comparison error:', e); }

        try {
          const localKelas = await window.localDB.getAll('master_kelas') || [];
          const { data: serverKelas } = await sb.from('master_kelas').select('*');
          if (serverKelas && serverKelas.length > localKelas.length) {
            kelasBaru = serverKelas.filter(sk => !localKelas.find(lk => lk.id === sk.id));
          } else if (serverKelas && localKelas.length === serverKelas.length) {
            kelasBaru = serverKelas.filter(sk => {
              const local = localKelas.find(lk => lk.id === sk.id);
              return !local || local.nama_kelas !== sk.nama_kelas || local.updated_at !== sk.updated_at;
            });
          }
        } catch(e) { console.error('Kelas comparison error:', e); }

        try {
          const localTransaksi = await window.localDB.getAll('transaksi') || [];
          const { data: serverTransaksi } = await sb.from('transaksi').select('id, total, nama_pembeli, updated_at').order('created_at', { ascending: false }).limit(50);
          if (serverTransaksi) {
            transaksiBaru = serverTransaksi.filter(st => !localTransaksi.find(lt => lt.id === st.id));
          }
        } catch(e) { console.error('Transaksi comparison error:', e); }

      } else {
        // ===== ONLINE-ONLY: Bandingkan timestamp =====
        // Cek apakah ada data baru di server sejak last sync
        try {
          const { data: updatedProduk } = await sb.from('produk').select('id, updated_at').gt('updated_at', lastSyncProduk).limit(1);
          if (updatedProduk && updatedProduk.length > 0) produkBaru = updatedProduk;
        } catch(e) {}

        try {
          const { data: updatedKelas } = await sb.from('master_kelas').select('id, updated_at').gt('updated_at', lastSyncKelas).limit(1);
          if (updatedKelas && updatedKelas.length > 0) kelasBaru = updatedKelas;
        } catch(e) {}

        try {
          const { data: updatedTrx } = await sb.from('transaksi').select('id, updated_at').gt('updated_at', lastSyncTransaksi).limit(1);
          if (updatedTrx && updatedTrx.length > 0) transaksiBaru = updatedTrx;
        } catch(e) {}
      }

      const hasUpdates = produkBaru.length > 0 || kelasBaru.length > 0 || transaksiBaru.length > 0;

      if (hasUpdates) {
        console.log(`✨ UPDATE: Produk=${produkBaru.length}, Kelas=${kelasBaru.length}, Transaksi=${transaksiBaru.length}`);
      } else {
        console.log('✅ Data sudah sesuai, tidak ada update');
      }

      return {
        hasUpdates,
        produk: produkBaru,
        kelas: kelasBaru,
        transaksi: transaksiBaru,
        lastSync: new Date().toISOString()
      };

    } catch (error) {
      console.error('Check update error:', error);
      return { hasUpdates: false, error: error.message };
    }
  }

  // ==================== TAMPILKAN NOTIFIKASI ====================
  showUpdateNotification(updates) {
    const totalUpdates = (updates.produk?.length || 0) + 
                         (updates.kelas?.length || 0) + 
                         (updates.transaksi?.length || 0);
    
    if (totalUpdates === 0) return;

    // Hapus notifikasi lama jika ada
    const oldNotif = document.querySelector('.sync-notification');
    if (oldNotif) oldNotif.remove();

    // Set cooldown setelah notifikasi ditampilkan
    localStorage.setItem('last_notify_time', Date.now().toString());

    // Buat elemen notifikasi
    const notification = document.createElement('div');
    notification.className = 'sync-notification';
    notification.innerHTML = `
      <div class="sync-notification-icon">
        <i class="fas fa-cloud-download-alt"></i>
      </div>
      <div class="sync-notification-content">
        <div class="sync-notification-title">Update Data Tersedia!</div>
        <div class="sync-notification-desc">
          ${updates.produk?.length > 0 ? `📦 ${updates.produk.length} produk baru/update<br>` : ''}
          ${updates.kelas?.length > 0 ? `📚 ${updates.kelas.length} kelas baru/update<br>` : ''}
          ${updates.transaksi?.length > 0 ? `🧾 ${updates.transaksi.length} transaksi baru<br>` : ''}
        </div>
      </div>
      <div class="sync-notification-actions">
        <button class="sync-now-btn" onclick="window.syncNotification.downloadAndSync()">
          <i class="fas fa-sync-alt"></i> Sinkronkan
        </button>
        <button class="sync-later-btn" onclick="window.syncNotification.hideNotification()">
          Nanti
        </button>
      </div>
    `;

    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);

    // Simpan ke localStorage untuk reminder
    localStorage.setItem('pending_updates', JSON.stringify({
      total: totalUpdates,
      timestamp: new Date().toISOString(),
      updates: updates
    }));
  }

  // ==================== DOWNLOAD & SYNC DATA ====================
  async downloadAndSync() {
    this.hideNotification();

    Swal.fire({
      title: 'Menyinkronkan Data...',
      html: '<div class="sync-progress-detail">Menjalankan sinkronisasi...</div>',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const isOfflineDevice = window.auth && window.auth.canUseOfflineMode();
      const now = new Date().toISOString();

      if (isOfflineDevice) {
        // Perangkat offline-capable: download ke IndexedDB
        await this.downloadAndSaveAllData();

        if (window.offlineCore && typeof window.offlineCore.downloadImagesToLocal === 'function') {
          await window.offlineCore.downloadImagesToLocal();
        }

        localStorage.setItem('last_full_sync', now);
        localStorage.setItem('last_sync_produk', now);
        localStorage.setItem('last_sync_kelas', now);
        localStorage.setItem('last_sync_transaksi', now);
      } else {
        // Perangkat online-only: cukup refresh data dari Supabase
        if (window.offlineCore && window.offlineCore.syncAll) {
          await window.offlineCore.syncAll();
        }
        // Set timestamp agar next check tidak selalu show update
        localStorage.setItem('last_full_sync', now);
        localStorage.setItem('last_sync_produk', now);
        localStorage.setItem('last_sync_kelas', now);
        localStorage.setItem('last_sync_transaksi', now);
      }

      localStorage.removeItem('pending_updates');

      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Selesai!',
        text: 'Data telah berhasil diperbarui.',
        timer: 2000,
        showConfirmButton: false
      });

      setTimeout(() => location.reload(), 1500);

    } catch (error) {
      console.error('Sync error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Sinkronisasi',
        text: error.message || 'Terjadi kesalahan saat sinkronisasi.',
        confirmButtonText: 'Coba Lagi'
      });
    }
  }

  async downloadAndSaveAllData() {
    const now = new Date().toISOString();

    // ========== DOWNLOAD SEMUA PRODUK (WITH KELAS) ==========
    const { data: allProduk } = await window.syncManager.fetchProdukWithKelas('*');
    if (allProduk) {
      for (const p of allProduk) {
        await window.localDB.save('produk', p, p.id);
      }
      console.log(`✅ Synced ${allProduk.length} produk with kelas`);
    }

    // ========== DOWNLOAD SEMUA KELAS ==========
    const { data: allKelas } = await sb.from('master_kelas').select('*');
    if (allKelas) {
      for (const k of allKelas) {
        await window.localDB.save('master_kelas', k, k.id);
      }
      console.log(`✅ Synced ${allKelas.length} kelas`);
    }

    // ========== PERBAIKAN: DOWNLOAD SEMUA TRANSAKSI, BUKAN HANYA YANG UPDATED ==========
    // Jangan filter by timestamp, ambil SEMUA transaksi dari server
    // Ini penting agar transaksi dari user lain juga ter-sync
    const { data: allTransaksi } = await sb
      .from('transaksi')
      .select('*, detail_transaksi(*)')
      .order('created_at', { ascending: false });

    if (allTransaksi && allTransaksi.length > 0) {
      console.log(`📥 Downloading ${allTransaksi.length} transaksi dari server...`);
      
      for (const t of allTransaksi) {
        // Simpan transaksi ke IndexedDB
        await window.localDB.save('transaksi', t, t.id);
        
        // Simpan detail transaksi jika ada
        if (t.detail_transaksi && Array.isArray(t.detail_transaksi)) {
          for (const d of t.detail_transaksi) {
            await window.localDB.save('detail_transaksi', d, d.id);
          }
          console.log(`  → Transaksi ${t.id}: ${t.detail_transaksi.length} detail items`);
        }
      }
      console.log(`✅ Total Synced ${allTransaksi.length} transaksi dengan detail`);
    }

    localStorage.setItem('last_sync_produk', now);
    localStorage.setItem('last_sync_kelas', now);
    localStorage.setItem('last_sync_transaksi', now);
  }

// ==================== HIDE NOTIFICATION ====================
hideNotification() {
  const notif = document.querySelector('.sync-notification');
  if (notif) {
    // Hapus class show untuk animasi keluar
    notif.classList.remove('show');
    // Tambahkan class hiding untuk transisi
    notif.classList.add('hiding');
    
    // Hapus dari DOM setelah animasi selesai
    setTimeout(() => {
      if (notif && notif.parentNode) {
        notif.parentNode.removeChild(notif);
      }
    }, 300);
  }
  
  // Hapus juga dari localStorage jika ada
  // Tapi biarkan pending_updates untuk reminder nanti
  // localStorage.removeItem('pending_updates');
}

  // ==================== CEK UPDATE PERIODIK ====================
  startPeriodicCheck(intervalMinutes = 10) {
    // Cek setiap interval menit
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      if (navigator.onLine) {
        // ========== COOLDOWN: Jangan spam notifikasi ==========
        // Cek hanya jika belum ada notifikasi dalam 5 menit terakhir
        const lastNotifyTime = localStorage.getItem('last_notify_time') || '0';
        const now = Date.now();
        
        if (now - parseInt(lastNotifyTime) >= 300000) { // 5 menit
          const updates = await this.checkForUpdates();
          if (updates.hasUpdates) {
            localStorage.setItem('last_notify_time', now.toString());
            this.showUpdateNotification(updates);
          }
        }

        // If current user is admin, check pending device approvals
        try {
          const currentRole = window.currentUserRole || window.currentRole;
          if (currentRole === 'admin') {
            const { data: pending, error } = await sb.from('offline_devices').select('device_id').eq('allowed', false).limit(100);
            if (!error && pending && pending.length > 0) {
              // show admin notification badge
              const oldBadge = document.querySelector('.admin-device-notif');
              if (!oldBadge) {
                const el = document.createElement('div');
                el.className = 'admin-device-notif';
                el.innerHTML = `<a href="#admin-devices" style="color:orange; font-weight:bold;">Perangkat baru: ${pending.length} (menunggu)</a>`;
                document.body.appendChild(el);
              } else {
                oldBadge.innerHTML = `<a href="#admin-devices" style="color:orange; font-weight:bold;">Perangkat baru: ${pending.length} (menunggu)</a>`;
              }
            } else {
              const oldBadge = document.querySelector('.admin-device-notif');
              if (oldBadge) oldBadge.remove();
            }
          }
        } catch (err) { console.warn('Pending device check failed', err); }
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`🔄 Periodic sync check started (every ${intervalMinutes} minutes)`);
  }

  // ==================== CEK MANUAL ====================
  async manualCheck() {
    Swal.fire({
      title: 'Memeriksa Update...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const updates = await this.checkForUpdates();
    
    Swal.close();

    if (updates.hasUpdates) {
      this.showUpdateNotification(updates);
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Tidak Ada Update',
        text: 'Data Anda sudah yang terbaru.',
        timer: 1500,
        showConfirmButton: false
      });
    }
  }

  // ==================== TAMBAHKAN KE MENU SIDEBAR ====================
  addToSidebar() {
    setTimeout(() => {
      const sidebarMenu = document.querySelector('.sidebar-menu');
      const currentRole = window.currentUserRole || window.currentRole;
      
      // Hanya admin yang bisa cek update data
      if (sidebarMenu && !document.getElementById('menu-sync-status') && currentRole === 'admin') {
        const syncItem = document.createElement('li');
        syncItem.id = 'menu-sync-status';
        syncItem.innerHTML = '<i class="fas fa-cloud-download-alt"></i><span>Cek Update Data</span>';
        syncItem.onclick = () => this.manualCheck();
        
        const logoutItem = document.querySelector('.sidebar-menu li.logout');
        if (logoutItem) {
          sidebarMenu.insertBefore(syncItem, logoutItem);
        } else {
          sidebarMenu.appendChild(syncItem);
        }
      }

      // If admin, add admin devices menu
      if (currentRole === 'admin') {
        try {
          if (!document.getElementById('menu-admin-devices')) {
            const adminItem = document.createElement('li');
            adminItem.id = 'menu-admin-devices';

            const adminLink = document.createElement('a');
            adminLink.href = '#';
            adminLink.className = 'menu-link';
            adminLink.innerHTML = '<i class="fas fa-desktop"></i><span>Manajemen Perangkat</span>';
            adminLink.addEventListener('click', (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              console.log('Admin devices menu clicked');
              if (window.showAdminDevicesPage) window.showAdminDevicesPage();
            });

            adminItem.appendChild(adminLink);

            const logoutItem = document.querySelector('.sidebar-menu li.logout');
            if (logoutItem) {
              sidebarMenu.insertBefore(adminItem, logoutItem);
            } else {
              sidebarMenu.appendChild(adminItem);
            }
          }
        } catch (e) { console.warn('Add admin menu failed', e); }
      }

      // Tambahkan indikator status sync (untuk semua role)
      this.addSyncStatusIndicator();
    }, 1000);
  }

  // ==================== INDIKATOR STATUS SYNC ====================
  addSyncStatusIndicator() {
    const lastSync = localStorage.getItem('last_full_sync');
    if (lastSync) {
      const lastSyncDate = new Date(lastSync);
      const now = new Date();
      const diffHours = Math.floor((now - lastSyncDate) / (1000 * 60 * 60));
      
      let statusText = '';
      let statusColor = '';
      
      if (diffHours < 1) {
        statusText = 'Data terbaru';
        statusColor = '#27ae60';
      } else if (diffHours < 24) {
        statusText = `${diffHours} jam yang lalu`;
        statusColor = '#f39c12';
      } else {
        statusText = `${Math.floor(diffHours / 24)} hari yang lalu`;
        statusColor = '#e74c3c';
      }

      // Hapus yang lama jika ada
      const oldStatus = document.querySelector('.sync-status-sidebar');
      if (oldStatus) oldStatus.remove();

      const statusEl = document.createElement('div');
      statusEl.className = 'sync-status-sidebar';
      statusEl.innerHTML = `
        <i class="fas fa-history"></i>
        <span>Sinkronisasi: ${statusText}</span>
      `;
      statusEl.style.cssText = `
        padding: 10px 20px;
        font-size: 0.7rem;
        color: ${statusColor};
        border-top: 1px solid rgba(255,255,255,0.1);
        margin-top: 10px;
      `;
      
      const sidebar = document.querySelector('.sidebar');
      if (sidebar && !document.querySelector('.sync-status-sidebar')) {
        sidebar.appendChild(statusEl);
      }
    }
  }

  // ==================== STOP PERIODIC CHECK ====================
  stopPeriodicCheck() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Periodic sync check stopped');
    }
  }
}

// Inisialisasi global
window.syncNotification = new SyncNotification();

// Helper: cek apakah admin
function _isAdmin() {
  return (window.currentUserRole || window.currentRole) === 'admin';
}

// Auto start periodic check saat online (hanya admin)
if (navigator.onLine && _isAdmin()) {
  window.syncNotification.startPeriodicCheck(10); // Cek setiap 10 menit
}

// Listen koneksi kembali online
window.addEventListener('online', () => {
  console.log('🌐 Koneksi kembali online');
  if (!_isAdmin()) return; // Hanya admin yang cek update
  
  window.syncNotification.startPeriodicCheck(10);
  setTimeout(() => {
    window.syncNotification.checkForUpdates().then(updates => {
      if (updates.hasUpdates) {
        window.syncNotification.showUpdateNotification(updates);
      }
    });
  }, 2000);
});

// Listen koneksi offline
window.addEventListener('offline', () => {
  console.log('📡 Koneksi offline - stopping periodic check');
  window.syncNotification.stopPeriodicCheck();
});

console.log('📡 Sync notification module loaded');