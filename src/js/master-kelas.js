// js/master-kelas.js
// Halaman manajemen master kelas - FULL VERSION (TANPA OfflineCore)

let currentKelasList = [];

// ==================== WARNA GRADIENT PER KELAS ====================
const kelasGradients = [
  'linear-gradient(135deg, #1a5c3e, #d4af37)',      // Dark Green - Gold
  'linear-gradient(135deg, #2d8659, #b99f3b)',      // Green - Bronze
  'linear-gradient(135deg, #305e3b, #c9a961)',      // Forest Green - Soft Gold
  'linear-gradient(135deg, #1d7a5c, #e6c200)',      // Teal Green - Bright Gold
  'linear-gradient(135deg, #2a6b46, #d4af37)',      // Sage Green - Gold
  'linear-gradient(135deg, #3c6b32, #b8860b)',      // Olive Green - Dark Goldenrod
  'linear-gradient(135deg, #1c5a3f, #daa520)',      // Deep Green - Goldenrod
  'linear-gradient(135deg, #2e7d5a, #c5a028)'       // Jade Green - Warm Gold
];

function getKelasGradient(index) {
  return kelasGradients[index % kelasGradients.length];
}

// ==================== LOAD HALAMAN UTAMA ====================
async function loadMasterKelasPage() {
  setActiveMenu('master-kelas');
  document.getElementById("pageTitle").innerHTML = '<i class="fas fa-layer-group"></i> Master Kelas';
  
  addKelasMenuToSidebar();
  await renderMasterKelas();
}

// ==================== TAMBAHKAN MENU KE SIDEBAR ====================
function addKelasMenuToSidebar() {
  var sidebarMenu = document.querySelector('.sidebar-menu');
  if (sidebarMenu && !document.getElementById('menu-master-kelas')) {
    var menuItem = document.createElement('li');
    menuItem.id = 'menu-master-kelas';
    menuItem.innerHTML = '<i class="fas fa-layer-group"></i><span>Master Kelas</span>';
    menuItem.onclick = function() { loadMasterKelasPage(); };
    
    var laporanMaster = document.getElementById('menu-laporan-master');
    if (laporanMaster) {
      sidebarMenu.insertBefore(menuItem, laporanMaster.nextSibling);
    } else {
      sidebarMenu.appendChild(menuItem);
    }
  }
}

// ==================== RENDER HALAMAN MASTER KELAS ====================
async function renderMasterKelas() {
  var kelasData = await window.offlineCore.getAllKelas();
  currentKelasList = kelasData.data || [];
  
  window.kelasMap = {};
  for (var i = 0; i < currentKelasList.length; i++) {
    window.kelasMap[currentKelasList[i].id] = currentKelasList[i].nama_kelas;
  }
  
  var html = `
    <div class="card">
      <div class="master-kelas-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
        <h2><i class="fas fa-layer-group" style="color:#3498db;"></i> Master Kelas</h2>
        <div style="display: flex; gap: 10px; flex-wrap:wrap;">
          <button class="btn btn-info" onclick="syncKelasFromServer()" style="background:#17a2b8;">
            <i class="fas fa-cloud-download-alt"></i> Sync dari Server
          </button>
          <button class="btn btn-primary" onclick="syncKelasToServer()">
            <i class="fas fa-cloud-upload-alt"></i> Sync ke Server
          </button>
          <button class="btn btn-success" onclick="showFormKelas()">
            <i class="fas fa-plus"></i> Tambah Kelas
          </button>
        </div>
      </div>
      
      <div class="stats-kelas" style="display:flex; gap:20px; margin:20px 0; padding:15px; background:#f8f9fa; border-radius:12px;">
        <div><strong>📚 Total Kelas:</strong> ${currentKelasList.length}</div>
        <div><strong>📦 Total Produk:</strong> <span id="totalProdukByKelas">0</span></div>
        <div><strong>🕐 Last Sync:</strong> <span id="lastSyncTime">${localStorage.getItem('last_kelas_sync') || 'Belum pernah'}</span></div>
      </div>
      
      <div class="kelas-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px,1fr)); gap:20px;">
  `;
  
  for (var i = 0; i < currentKelasList.length; i++) {
    var k = currentKelasList[i];
    var produkCount = await getProdukCountByKelas(k.id);
    var gradient = getKelasGradient(i);
    html += `
      <div class="kelas-card" style="background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        <div class="kelas-card-header" style="background:${gradient}; color:white; padding:20px; text-align:center;">
          <h3 style="margin:0;"><i class="fas fa-graduation-cap"></i> ${escapeHtml(k.nama_kelas)}</h3>
        </div>
        <div class="kelas-card-body" style="padding:20px;">
          <p style="color:#666; min-height:60px;">${escapeHtml(k.deskripsi || 'Tidak ada deskripsi')}</p>
          <div class="kelas-stats" style="display:flex; gap:15px; margin:15px 0; padding:10px 0; border-top:1px solid #eee; border-bottom:1px solid #eee;">
            <span><i class="fas fa-box"></i> ${produkCount} Produk</span>
            <span><i class="fas fa-clock"></i> ${formatDate(k.updated_at)}</span>
          </div>
          <div class="kelas-actions" style="display:flex; gap:10px; justify-content:flex-end;">
            <button class="btn btn-primary btn-sm" onclick="editKelas('${k.id}')">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="hapusKelas('${k.id}')">
              <i class="fas fa-trash"></i> Hapus
            </button>
            <button class="btn btn-info btn-sm" onclick="lihatProdukByKelas('${k.id}', '${escapeHtml(k.nama_kelas)}')">
              <i class="fas fa-eye"></i> Lihat Produk
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  if (currentKelasList.length === 0) {
    html += '<div class="empty-state" style="grid-column:1/-1; text-align:center; padding:50px;"><i class="fas fa-layer-group" style="font-size:4rem; color:#95a5a6"></i><h3>Belum Ada Kelas</h3><p>Klik "Tambah Kelas" untuk membuat kelas baru</p></div>';
  }
  
  html += `</div></div>`;
  
  document.getElementById("content").innerHTML = html;
  
  var totalProduk = 0;
  for (var j = 0; j < currentKelasList.length; j++) {
    totalProduk += await getProdukCountByKelas(currentKelasList[j].id);
  }
  document.getElementById("totalProdukByKelas").innerText = totalProduk;
}

// ==================== FORMAT TANGGAL ====================
function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    var date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch(e) {
    return '-';
  }
}

// ==================== HITUNG JUMLAH PRODUK PER KELAS ====================
async function getProdukCountByKelas(kelasId) {
  var produkData = await window.offlineCore.getProdukByKelasId(kelasId);
  return produkData.data.length;
}

// ==================== FORM TAMBAH/EDIT KELAS ====================
function showFormKelas(kelas = null) {
  var isEdit = kelas ? true : false;
  var nama_kelas = kelas ? kelas.nama_kelas : "";
  var deskripsi = kelas ? (kelas.deskripsi || "") : "";
  
  Swal.fire({
    title: isEdit ? 'Edit Kelas' : 'Tambah Kelas Baru',
    html: `
      <div style="text-align:left">
        <div class="form-group">
          <label>Nama Kelas <span style="color:red">*</span></label>
          <input type="text" id="nama_kelas" class="swal2-input" style="width:100%" placeholder="Contoh: Kelas 1, Paket A" value="${escapeHtml(nama_kelas)}">
        </div>
        <div class="form-group" style="margin-top:15px">
          <label>Deskripsi (Opsional)</label>
          <textarea id="deskripsi" class="swal2-textarea" style="width:100%; height:80px" placeholder="Deskripsi kelas...">${escapeHtml(deskripsi)}</textarea>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: isEdit ? 'Simpan Perubahan' : 'Tambah Kelas',
    cancelButtonText: 'Batal',
    preConfirm: function() {
      var nama = document.getElementById('nama_kelas').value;
      if (!nama) {
        Swal.showValidationMessage('Nama kelas harus diisi!');
        return false;
      }
      return { nama_kelas: nama, deskripsi: document.getElementById('deskripsi').value };
    }
  }).then(async function(result) {
    if (result.isConfirmed) {
      Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
      
      var data = {
        nama_kelas: result.value.nama_kelas,
        deskripsi: result.value.deskripsi
      };
      
      var saveResult = await window.offlineCore.saveKelas(data, isEdit ? kelas.id : null);
      
      Swal.close();
      if (saveResult.success) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: isEdit ? 'Kelas diperbarui' : 'Kelas ditambahkan', timer: 1500 });
        await renderMasterKelas();
        await updateProdukKelasSelect();
        await refreshKelasData();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan kelas' });
      }
    }
  });
}

// ==================== EDIT KELAS ====================
async function editKelas(id) {
  var result = await window.offlineCore.getKelasById(id);
  if (result.data) showFormKelas(result.data);
  else Swal.fire({ icon: 'error', title: 'Gagal', text: 'Kelas tidak ditemukan' });
}

// ==================== HAPUS KELAS ====================
async function hapusKelas(id) {
  var produkData = await window.offlineCore.getProdukByKelasId(id);
  if (produkData.data.length > 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Tidak Bisa Dihapus',
      text: 'Kelas ini masih memiliki ' + produkData.data.length + ' produk. Pindahkan atau hapus produk terlebih dahulu.',
      confirmButtonColor: '#e74c3c'
    });
    return;
  }
  
  var confirm = await Swal.fire({
    title: 'Hapus Kelas?',
    text: 'Kelas akan dihapus permanen',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus',
    cancelButtonText: 'Batal'
  });
  
  if (confirm.isConfirmed) {
    Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
    var result = await window.offlineCore.deleteKelas(id);
    Swal.close();
    if (result.success) {
      Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Kelas dihapus', timer: 1500 });
      await renderMasterKelas();
      await updateProdukKelasSelect();
      await refreshKelasData();
    } else {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus kelas' });
    }
  }
}

// ==================== LIHAT PRODUK PER KELAS ====================
async function lihatProdukByKelas(kelasId, namaKelas) {
  var produkData = await window.offlineCore.getProdukByKelasId(kelasId);
  var produk = produkData.data || [];
  
  if (produk.length === 0) {
    Swal.fire({ icon: 'info', title: 'Tidak Ada Produk', text: 'Belum ada produk dalam kelas ' + namaKelas });
    return;
  }
  
  var html = '<div style="max-height:400px; overflow-y:auto;">';
  for (var i = 0; i < produk.length; i++) {
    var p = produk[i];
    html += '<div style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid #eee;">';
    html += '<img src="' + (p.gambar_url || 'https://via.placeholder.com/40') + '" style="width:40px; height:40px; object-fit:cover; border-radius:8px;" onerror="this.src=\'https://via.placeholder.com/40\'">';
    html += '<div style="flex:1;"><strong>' + escapeHtml(p.nama) + '</strong><br><small>Harga: Rp ' + (p.harga_jual || 0).toLocaleString() + ' | Stok: ' + (p.stok || 0) + '</small></div>';
    html += '<button class="btn btn-primary btn-sm" onclick="window.location.href=\'#\'; setTimeout(function(){ loadProdukPage(); editProduk(\'' + p.id + '\'); }, 100);" style="padding:5px 10px;">Edit</button>';
    html += '</div>';
  }
  html += '</div>';
  
  Swal.fire({
    title: 'Produk dalam ' + namaKelas,
    html: html,
    width: '600px',
    confirmButtonText: 'Tutup'
  });
}

// ==================== SYNC KELAS KE SERVER (UPLOAD) ====================
async function syncKelasToServer() {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Offline', text: 'Sambungkan internet untuk sinkronisasi' });
    return false;
  }
  
  Swal.fire({ title: 'Menyinkronkan Kelas ke Server...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
  
  try {
    const result = await window.offlineCore.syncKelasToSupabase();
    Swal.close();
    
    if (result.success) {
      Swal.fire({ icon: 'success', title: 'Sinkronisasi Berhasil!', text: `${result.uploaded || 0} kelas disinkronkan`, timer: 2000 });
      await renderMasterKelas();
    } else {
      Swal.fire({ icon: 'error', title: 'Gagal', text: result.error });
    }
  } catch (error) {
    Swal.close();
    Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
  }
}

// ==================== SYNC KELAS DARI SERVER (DOWNLOAD) ====================
async function syncKelasFromServer() {
  if (!navigator.onLine) {
    Swal.fire({ icon: 'warning', title: 'Offline', text: 'Sambungkan internet untuk mengambil data' });
    return false;
  }
  
  Swal.fire({ title: 'Mengambil Data Kelas dari Server...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
  
  try {
    const result = await window.offlineCore.syncKelasFromSupabase();
    Swal.close();
    
    if (result.success) {
      Swal.fire({ icon: 'success', title: 'Berhasil!', text: `${result.added || 0} kelas baru, ${result.updated || 0} diupdate`, timer: 2000 });
      await renderMasterKelas();
      await updateProdukKelasSelect();
    } else {
      Swal.fire({ icon: 'error', title: 'Gagal', text: result.error });
    }
  } catch (error) {
    Swal.close();
    Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
  }
}

// ==================== REFRESH KELAS DATA GLOBAL ====================
async function refreshKelasData() {
  var kelasData = await window.offlineCore.getAllKelas();
  var kelasList = kelasData.data || [];
  window.kelasMap = {};
  for (var i = 0; i < kelasList.length; i++) {
    window.kelasMap[kelasList[i].id] = kelasList[i].nama_kelas;
  }
  console.log('🔄 Kelas data refreshed, total:', kelasList.length);
}

// ==================== UPDATE DROPDOWN KELAS ====================
async function updateProdukKelasSelect() {
  var kelasSelect = document.getElementById('kelas_id');
  if (!kelasSelect) return;
  
  var kelasData = await window.offlineCore.getAllKelas();
  var kelasList = kelasData.data || [];
  
  var currentValue = kelasSelect.value;
  kelasSelect.innerHTML = '<option value="">-- Pilih Kelas --</option>';
  for (var i = 0; i < kelasList.length; i++) {
    var selected = (currentValue === kelasList[i].id) ? 'selected' : '';
    kelasSelect.innerHTML += '<option value="' + kelasList[i].id + '" ' + selected + '>' + escapeHtml(kelasList[i].nama_kelas) + '</option>';
  }
}

// ==================== ESCAPE HTML ====================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ==================== EKSPOR FUNGSI KE GLOBAL ====================
window.loadMasterKelasPage = loadMasterKelasPage;
window.showFormKelas = showFormKelas;
window.editKelas = editKelas;
window.hapusKelas = hapusKelas;
window.lihatProdukByKelas = lihatProdukByKelas;
window.syncKelasToServer = syncKelasToServer;
window.syncKelasFromServer = syncKelasFromServer;
window.refreshKelasData = refreshKelasData;
window.updateProdukKelasSelect = updateProdukKelasSelect;

console.log('📚 Master Kelas module loaded');