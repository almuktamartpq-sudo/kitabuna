// js/app-offline.js - FULL VERSION DENGAN FIX KELAS

const offlineKelasGradients = [
  'linear-gradient(135deg, #1a5c3e, #d4af37)',
  'linear-gradient(135deg, #2d8659, #b99f3b)',
  'linear-gradient(135deg, #305e3b, #c9a961)',
  'linear-gradient(135deg, #1d7a5c, #e6c200)',
  'linear-gradient(135deg, #2a6b46, #d4af37)',
  'linear-gradient(135deg, #3c6b32, #b8860b)',
  'linear-gradient(135deg, #1c5a3f, #daa520)',
  'linear-gradient(135deg, #2e7d5a, #c5a028)'
];

function getOfflineKelasGradient(index) {
  return offlineKelasGradients[index % offlineKelasGradients.length];
}

// ==================== DASHBOARD ====================
async function loadDashboard() {
  setActiveMenu('dashboard');
  var titleEl = document.getElementById("pageTitle");
  if (titleEl) titleEl.innerText = "Dashboard";
  var contentEl = document.getElementById("content");
  if (contentEl) {
    contentEl.innerHTML = '<div class="card"><div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Memuat data dashboard...</p></div></div>';
  }
  await loadDashboardData();
}

async function loadDashboardData() {
  try {
    var transaksiData = await window.offlineCore.getTransaksi();
    var transaksi = transaksiData.data || [];
    
    if (!transaksi || transaksi.length === 0) {
      document.getElementById("content").innerHTML = '<div class="card"><h2>Dashboard Penjualan</h2><div class="grid-dashboard"><div class="stat-box"><h3><i class="fas fa-shopping-cart"></i> Total Transaksi</h3><p>0</p></div><div class="stat-box"><h3><i class="fas fa-chart-line"></i> Transaksi Hari Ini</h3><p>0</p></div><div class="stat-box"><h3><i class="fas fa-money-bill-wave"></i> Total Omzet</h3><p>Rp 0</p></div><div class="stat-box"><h3><i class="fas fa-chart-pie"></i> Total Laba</h3><p>Rp 0</p></div></div><div class="empty-state"><i class="fas fa-chart-line"></i><p>Belum ada data transaksi</p></div></div>';
      return;
    }

    var totalOmzet = 0, totalLaba = 0;
    for (var i = 0; i < transaksi.length; i++) {
      totalOmzet += Number(transaksi[i].total || 0);
      totalLaba += Number(transaksi[i].total_laba || 0);
    }

    var today = new Date().toISOString().split('T')[0];
    var transaksiHariIni = 0;
    for (var j = 0; j < transaksi.length; j++) {
      if (transaksi[j].created_at && transaksi[j].created_at.startsWith(today)) transaksiHariIni++;
    }

    document.getElementById("content").innerHTML = '<div class="card"><h2>Dashboard Penjualan</h2><div class="grid-dashboard"><div class="stat-box"><h3><i class="fas fa-shopping-cart"></i> Total Transaksi</h3><p>' + transaksi.length + '</p></div><div class="stat-box"><h3><i class="fas fa-chart-line"></i> Transaksi Hari Ini</h3><p>' + transaksiHariIni + '</p></div><div class="stat-box"><h3><i class="fas fa-money-bill-wave"></i> Total Omzet</h3><p>Rp ' + totalOmzet.toLocaleString() + '</p></div><div class="stat-box"><h3><i class="fas fa-chart-pie"></i> Total Laba</h3><p>Rp ' + totalLaba.toLocaleString() + '</p></div></div><hr style="margin:30px 0;"><div class="dashboard-charts"><div class="chart-card"><h3><i class="fas fa-chart-line"></i> Grafik Harian</h3><div class="chart-container"><canvas id="chartHarian"></canvas></div></div><div class="chart-card"><h3><i class="fas fa-chart-bar"></i> Grafik Bulanan</h3><div class="chart-container"><canvas id="chartBulanan"></canvas></div></div></div><div class="chart-card chart-full"><h3><i class="fas fa-chart-bar"></i> Grafik Tahunan</h3><div class="chart-container"><canvas id="chartTahunan"></canvas></div></div></div>';

    renderCharts(transaksi);
  } catch(error) {
    console.error('Error loading dashboard:', error);
    document.getElementById("content").innerHTML = '<div class="card text-center"><i class="fas fa-exclamation-triangle text-danger" style="font-size:3rem;"></i><p style="color:#e74c3c;margin:20px 0;">Gagal memuat data dashboard</p><button class="btn btn-primary" onclick="loadDashboard()"><i class="fas fa-sync-alt"></i> Coba Lagi</button></div>';
  }
}

function renderCharts(transaksi) {
  setTimeout(function() {
    var harian = {}, bulanan = {}, tahunan = {};
    for (var i = 0; i < transaksi.length; i++) {
      var t = transaksi[i];
      var date = new Date(t.created_at);
      var hari = date.toISOString().split("T")[0];
      var bulan = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, '0');
      var tahun = date.getFullYear();
      harian[hari] = (harian[hari] || 0) + Number(t.total);
      bulanan[bulan] = (bulanan[bulan] || 0) + Number(t.total);
      tahunan[tahun] = (tahunan[tahun] || 0) + Number(t.total);
    }
    if (document.getElementById("chartHarian")) {
      var labelsH = Object.keys(harian).slice(-7);
      var valuesH = Object.values(harian).slice(-7);
      if (labelsH.length > 0) new Chart(document.getElementById("chartHarian"), { type: "line", data: { labels: labelsH, datasets: [{ label: "Omzet Harian", data: valuesH, borderColor: "#3498db", backgroundColor: "rgba(52,152,219,0.1)", borderWidth: 3, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: function(v) { return 'Rp ' + v.toLocaleString(); } } } } } });
    }
    if (document.getElementById("chartBulanan")) {
      var labelsB = Object.keys(bulanan).slice(-6);
      var valuesB = Object.values(bulanan).slice(-6);
      if (labelsB.length > 0) new Chart(document.getElementById("chartBulanan"), { type: "bar", data: { labels: labelsB, datasets: [{ label: "Omzet Bulanan", data: valuesB, backgroundColor: "#27ae60", borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: function(v) { return 'Rp ' + v.toLocaleString(); } } } } } });
    }
    if (document.getElementById("chartTahunan")) {
      var labelsT = Object.keys(tahunan);
      var valuesT = Object.values(tahunan);
      if (labelsT.length > 0) new Chart(document.getElementById("chartTahunan"), { type: "bar", data: { labels: labelsT, datasets: [{ label: "Omzet Tahunan", data: valuesT, backgroundColor: "#e74c3c", borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: function(v) { return 'Rp ' + v.toLocaleString(); } } } } } });
    }
  }, 200);
}

// ==================== PRODUK ====================
async function loadProdukPage() {
  setActiveMenu('produk');
  document.getElementById("pageTitle").innerText = "Manajemen Produk";
  
  // Load kelas map terlebih dahulu
  await refreshKelasData();
  
  // Ambil daftar kelas untuk dropdown
  var kelasData = await window.offlineCore.getAllKelas();
  var kelasList = kelasData.data || [];
  
  // Buat opsi dropdown kelas
  var kelasOptions = '<option value="all">Semua Kelas</option>';
  for (var i = 0; i < kelasList.length; i++) {
    kelasOptions += '<option value="' + kelasList[i].id + '">' + escapeHtml(kelasList[i].nama_kelas) + '</option>';
  }
  
  var addButton = (window.currentRole === "admin") ? '<button class="btn btn-success" onclick="showForm()"><i class="fas fa-plus"></i> Tambah Produk</button>' : '';
  
  document.getElementById("content").innerHTML = '<div class="card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">' +
     
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<div class="input-group" style="width:250px;margin-bottom:0;">' +
          '<i class="fas fa-search"></i>' +
          '<input type="text" id="search" placeholder="Cari produk..." onkeyup="loadProduk()" style="padding:10px 35px;">' +
        '</div>' +
        '<div class="input-group" style="width:200px;margin-bottom:0;">' +
          '<i class="fas fa-layer-group"></i>' +
          '<select id="filterKelas" onchange="loadProduk()" style="padding:10px 35px;border-radius:8px;border:1px solid #ddd;">' + kelasOptions + '</select>' +
        '</div>' +
        addButton +
      '</div>' +
    '</div>' +
    '<div id="produkList" class="table-container"></div>' +
  '</div>';
  
  await loadProduk();
}

async function loadProduk() {
  try {
    // Refresh kelasMap sebelum render agar badge kelas selalu terisi
    await refreshKelasData();

    var keyword = document.getElementById("search") ? document.getElementById("search").value : "";
    var filterKelas = document.getElementById("filterKelas") ? document.getElementById("filterKelas").value : "all";
    
    // Ambil produk berdasarkan filter
    var produkData;
    if (filterKelas !== "all") {
      produkData = await window.offlineCore.getProdukByKelasId(filterKelas);
    } else {
      produkData = await window.offlineCore.getProduk(keyword);
    }
    
    var data = produkData.data || [];
    console.log('📊 loadProduk: Retrieved', data.length, 'produk');
    if (data.length > 0) {
      console.log('🔍 loadProduk: Sample produk:', data[0]);
    }
    
    // Filter tambahan berdasarkan keyword (jika menggunakan getProdukByKelasId tidak ada filter keyword)
    if (filterKelas !== "all" && keyword) {
      data = data.filter(function(p) {
        return p.nama.toLowerCase().includes(keyword.toLowerCase());
      });
    }
    
    if (!data || data.length === 0) {
      document.getElementById("produkList").innerHTML = '<div class="text-center" style="padding:50px 0;"><i class="fas fa-box-open" style="font-size:4rem;color:#95a5a6"></i><p style="color:#95a5a6;margin-top:20px;">Belum ada produk</p></div>';
      return;
    }

    var html = '<div class="produk-grid">';
    
    for (var i = 0; i < data.length; i++) {
      var p = data[i];
      console.log('🎨 Rendering produk', i+1, '/', data.length, '- nama:', p.nama, '- kelas_ids:', p.kelas_ids);
      var harga = Number(p.harga_jual || 0).toLocaleString();
      var stok = Number(p.stok || 0);
      
      // Warna stok berdasarkan jumlah
      // Stok <= 5 = MERAH, 6-10 = KUNING, >10 = HIJAU
      var stokColor = "";
      if (stok <= 5) {
        stokColor = "#e74c3c"; // MERAH
      } else if (stok <= 10) {
        stokColor = "#f39c12"; // KUNING
      } else {
        stokColor = "#27ae60"; // HIJAU
      }
      
      // Ambil nama kelas dari kelasMap (global) atau dari hasil view string
      var kelasNames = [];
      if (Array.isArray(p.kelas_ids) && p.kelas_ids.length > 0) {
        console.log('  📋 kelas_ids array found:', p.kelas_ids);
        for (var ki = 0; ki < p.kelas_ids.length; ki++) {
          var kid = p.kelas_ids[ki];
          console.log('    🔍 Checking kelas ID:', kid, '- window.kelasMap exists:', !!window.kelasMap, '- map value:', window.kelasMap ? window.kelasMap[kid] : 'N/A');
          if (window.kelasMap && window.kelasMap[kid]) kelasNames.push(window.kelasMap[kid]);
          else kelasNames.push(kid);
        }
      } else if (Array.isArray(p.kelas_names) && p.kelas_names.length > 0) {
        console.log('  📋 kelas_names array found:', p.kelas_names);
        kelasNames = p.kelas_names;
      } else if (typeof p.kelas === 'string' && p.kelas.trim()) {
        console.log('  📋 kelas string found:', p.kelas);
        kelasNames = p.kelas.split(/\s*,\s*/).filter(Boolean);
      } else if (p.kelas_id) {
        console.log('  📋 Legacy kelas_id found:', p.kelas_id);
        if (window.kelasMap && window.kelasMap[p.kelas_id]) kelasNames.push(window.kelasMap[p.kelas_id]);
        else kelasNames.push(p.kelas_id);
      } else {
        console.log('  ⚠️ No kelas found for this produk');
      }

      // TAMPILKAN GAMBAR
      var gambarHtml = '';
      var gambarLocal = await window.localDB.getImageLocally(p.id);
      
      if (gambarLocal) {
        gambarHtml = '<img src="' + gambarLocal + '" loading="lazy">';
      } else if (p.gambar_url) {
        gambarHtml = '<img src="' + p.gambar_url + '" loading="lazy" onerror="this.src=\'https://via.placeholder.com/150?text=Gambar+Error\'">';
      } else {
        gambarHtml = '<div style="width:100%;height:180px;background:#f1f1f1;display:flex;align-items:center;justify-content:center;border-radius:8px;"><i class="fas fa-image" style="font-size:30px;color:#aaa;"></i></div>';
      }
      
      // Container untuk badge (stok dan kelas sejajar)
      var badgesContainer = '<div style="display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap;">' +
        '<span style="display:inline-block;background:' + stokColor + ';color:white;font-size:11px;padding:4px 10px;border-radius:20px;font-weight:500;">Stok ' + stok + '</span>';
      
      if (kelasNames.length > 0) {
        for (var kn = 0; kn < kelasNames.length; kn++) {
          badgesContainer += '<span style="display:inline-block;background:#3498db;color:white;font-size:11px;padding:4px 10px;border-radius:20px;font-weight:500;">' + escapeHtml(kelasNames[kn]) + '</span>';
        }
      }
      
      badgesContainer += '</div>';
      
      var aksi = (window.currentRole === "admin") ? '<div style="margin-top:10px;display:flex;gap:8px;justify-content:center;"><button class="btn btn-primary btn-sm" onclick="editProduk(\'' + p.id + '\')"><i class="fas fa-edit"></i> Edit</button> <button class="btn btn-danger btn-sm" onclick="hapusProduk(\'' + p.id + '\')"><i class="fas fa-trash"></i> Hapus</button></div>' : '';
      
      html += '<div class="produk-card" style="text-align:center;">' + 
        gambarHtml + 
        '<h4 style="margin:10px 0 5px;">' + p.nama + '</h4>' +
        '<p style="color:#e74c3c;font-weight:bold;margin:5px 0;">Rp ' + harga + '</p>' +
        badgesContainer +
        aksi + 
      '</div>';
    }
    html += '</div>';
    document.getElementById("produkList").innerHTML = html;
  } catch(error) {
    console.error("❌ Error loading produk:", error);
    document.getElementById("produkList").innerHTML = '<div class="text-center text-danger" style="padding:40px;"><i class="fas fa-exclamation-triangle"></i> Gagal memuat data produk</div>';
  }
}

// ==================== SHOW FORM PRODUK DENGAN LOAD KELAS ====================
function showForm(produk) {
  var nama = produk ? produk.nama : "";
  var harga_beli = produk ? produk.harga_beli : "";
  var harga_jual = produk ? produk.harga_jual : "";
  var stok = produk ? produk.stok : "";
  var kategori = produk ? (produk.kategori || "Umum") : "Umum";
  var kelas_ids = produk ? (produk.kelas_ids || (produk.kelas_id ? [produk.kelas_id] : [])) : [];
  var gambar_url = produk ? (produk.gambar_url || "") : "";
  var isEdit = produk ? true : false;
  
  var previewHtml = '';
  if (gambar_url && gambar_url !== '') {
    previewHtml = '<div style="margin-top:10px; padding:10px; background:#f8f9fa; border-radius:8px;">' +
      '<label>Gambar Saat Ini:</label><br>' +
      '<img src="' + gambar_url + '" style="max-width:150px; max-height:150px; border-radius:8px; border:1px solid #ddd; margin-top:5px;" onerror="this.src=\'https://via.placeholder.com/150?text=Gambar+Error\'">' +
      '<p style="font-size:11px; color:#666; margin-top:5px;">URL: ' + (gambar_url.substring(0, 50) || '') + (gambar_url.length > 50 ? '...' : '') + '</p>' +
    '</div>';
  }
  
  Swal.fire({ title: 'Memuat form...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
  
  // Ambil daftar kelas untuk dropdown
  window.offlineCore.getAllKelas().then(function(kelasData) {
    var kelasList = kelasData.data || [];
    var kelasOptions = '';
    for (var i = 0; i < kelasList.length; i++) {
      var selected = (Array.isArray(kelas_ids) && kelas_ids.indexOf(kelasList[i].id) !== -1) ? 'selected' : '';
      kelasOptions += '<option value="' + kelasList[i].id + '" ' + selected + '>' + escapeHtml(kelasList[i].nama_kelas) + '</option>';
    }
    
    Swal.close();
    
    var formHtml = '<div class="card">' +
      '<h3><i class="fas ' + (isEdit ? 'fa-edit' : 'fa-plus') + '"></i> ' + (isEdit ? "Edit" : "Tambah") + ' Produk</h3>' +
      '<form onsubmit="event.preventDefault(); simpanProduk(\'' + (produk ? produk.id : "") + '\')">' +
        '<div class="form-group">' +
          '<label>Nama Produk</label>' +
          '<input type="text" class="form-control" id="nama" value="' + escapeHtml(nama) + '" required>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Kategori</label>' +
          '<select class="form-control" id="kategori">' +
            '<option value="Umum"' + (kategori === 'Umum' ? ' selected' : '') + '>Umum</option>' +
            '<option value="Kitab"' + (kategori === 'Kitab' ? ' selected' : '') + '>Kitab</option>' +
            '<option value="Alat Tulis"' + (kategori === 'Alat Tulis' ? ' selected' : '') + '>Alat Tulis</option>' +
            '<option value="Lainnya"' + (kategori === 'Lainnya' ? ' selected' : '') + '>Lainnya</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Kelas (pilih beberapa)</label>' +
          '<select class="form-control" id="kelas_ids" multiple style="min-height:120px;">' + kelasOptions + '</select>' +
          '<small style="color:#95a5a6;">Tahan Ctrl/Cmd untuk memilih beberapa. Kelola kelas di menu "Master Kelas"</small>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Harga Beli</label>' +
          '<input type="number" class="form-control" id="harga_beli" value="' + harga_beli + '" required>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Harga Jual</label>' +
          '<input type="number" class="form-control" id="harga_jual" value="' + harga_jual + '" required>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Stok</label>' +
          '<input type="number" class="form-control" id="stok" value="' + stok + '" required>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Gambar Produk</label>' +
          '<input type="file" class="form-control" id="gambar" accept="image/*" onchange="previewImage(this)">' +
          '<small style="color:#95a5a6;">Format: JPG, PNG. Maks: 2MB</small>' +
          '<div id="imagePreviewContainer">' + previewHtml + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:20px;">' +
          '<button type="submit" class="btn btn-success"><i class="fas fa-save"></i> Simpan</button>' +
          '<button type="button" class="btn btn-warning" onclick="loadProdukPage()"><i class="fas fa-arrow-left"></i> Kembali</button>' +
        '</div>' +
      '</form>' +
    '</div>';
    
    document.getElementById("content").innerHTML = formHtml;
  });
}

function previewImage(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var previewHtml = '<div style="margin-top:10px; padding:10px; background:#f8f9fa; border-radius:8px;">' +
        '<label>Gambar Baru:</label><br>' +
        '<img src="' + e.target.result + '" style="max-width:150px; max-height:150px; border-radius:8px; border:1px solid #ddd; margin-top:5px;">' +
        '<p style="font-size:11px; color:#666; margin-top:5px;">Gambar akan diupload saat disimpan</p>' +
      '</div>';
      
      var container = document.getElementById('imagePreviewContainer');
      if (container) {
        container.innerHTML = previewHtml;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

async function simpanProduk(id) {
  try {
    var nama = document.getElementById("nama").value;
    if (!nama) { 
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Nama produk harus diisi' }); 
      return; 
    }
    
    var kategori = document.getElementById("kategori") ? document.getElementById("kategori").value : "Umum";
    var kelas_ids = [];
    var kelasSelect = document.getElementById("kelas_ids");
    if (kelasSelect) {
      for (var i = 0; i < kelasSelect.selectedOptions.length; i++) {
        kelas_ids.push(kelasSelect.selectedOptions[i].value);
      }
    }
    if (kelas_ids.length === 0) kelas_ids = null;
    
    var harga_beli = parseFloat(document.getElementById("harga_beli").value) || 0;
    var harga_jual = parseFloat(document.getElementById("harga_jual").value) || 0;
    var stok = parseInt(document.getElementById("stok").value) || 0;
    var file = document.getElementById("gambar").files[0];
    
    var dataProduk = {
      nama: nama,
      kategori: kategori,
      kelas_ids: kelas_ids,
      kelas_id: (Array.isArray(kelas_ids) && kelas_ids.length>0) ? kelas_ids[0] : null,
      harga_beli: harga_beli,
      harga_jual: harga_jual,
      stok: stok
    };
    
    Swal.fire({ title: 'Menyimpan...', text: 'Mohon tunggu', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
    
    // Jika ada file gambar baru
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        Swal.close();
        Swal.fire({ icon: 'warning', title: 'Ukuran Terlalu Besar', text: 'Maksimal ukuran file 2MB' });
        return;
      }
      
      // Konversi gambar ke Base64 untuk penyimpanan lokal
      var base64Image = await new Promise(function(resolve) {
        var reader = new FileReader();
        reader.onloadend = function() { resolve(reader.result); };
        reader.readAsDataURL(file);
      });
      
      // Simpan gambar lokal dulu
      var saveId = id || 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      await window.localDB.saveImageLocally(saveId, base64Image);
      dataProduk.gambar_base64 = base64Image; // temporary untuk upload nanti
      
      // Upload ke Supabase jika online
      if (navigator.onLine) {
        var fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        var { error: uploadError } = await sb.storage.from("produk-images").upload(fileName, file);
        
        if (!uploadError) {
          var { data: urlData } = sb.storage.from("produk-images").getPublicUrl(fileName);
          dataProduk.gambar_url = urlData.publicUrl;
        }
      }
    } else if (id) {
      // Jika tidak upload gambar baru, gunakan gambar yang sudah ada
      var existingProduk = await window.offlineCore.getProdukById(id);
      if (existingProduk.data && existingProduk.data.gambar_url) {
        dataProduk.gambar_url = existingProduk.data.gambar_url;
      }
    }
    
    var result = await window.offlineCore.saveProduk(dataProduk, id);
    
    Swal.close();
    
    if (result.success) {
      Swal.fire({ icon: 'success', title: 'Berhasil', text: id ? 'Produk diperbarui' : 'Produk ditambahkan', timer: 1500 });
      loadProdukPage();
    } else {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan produk' });
    }
  } catch(error) {
    Swal.close();
    console.error('Error saving product:', error);
    Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
  }
}

async function editProduk(id) {
  Swal.fire({ title: 'Memuat data...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
  var result = await window.offlineCore.getProdukById(id);
  Swal.close();
  if (result.data) showForm(result.data);
  else Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal memuat data produk' });
}

async function hapusProduk(id) {
  var confirm = await Swal.fire({ title: 'Yakin?', text: 'Produk akan dihapus permanen', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal' });
  if (!confirm.isConfirmed) return;
  
  Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
  var result = await window.offlineCore.deleteProduk(id);
  Swal.close();
  
  if (result.success) {
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Produk dihapus', timer: 1500 });
    loadProduk();
  } else {
    Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus produk' });
  }
}

// ==================== KASIR ====================
var cart = [];

async function loadKasir() {
  document.body.classList.add("page-kasir");
  setActiveMenu('kasir');
  document.getElementById("pageTitle").innerText = "Kasir";
  
  // Refresh kelas map terlebih dahulu
  await refreshKelasData();
  
  var produkData = await window.offlineCore.getProduk();
  var produk = produkData.data || [];
  
  var html = '<div class="kasir-container"><div class="produk-area"><div class="search-wrapper" style="display:flex;gap:8px;margin-bottom:15px;align-items:center;">' +
    '<div class="input-group" style="flex:1;margin:0;"><i class="fas fa-search"></i>' +
    '<input type="text" id="searchProduk" class="form-control" placeholder="Cari produk..." onkeyup="filterProduk()" style="padding-left:45px;"></div>' +
    '<button class="kelas-btn" onclick="showKelasModal()" style="padding:8px 12px;font-size:13px;white-space:nowrap;background:#3498db;color:white;border:none;border-radius:6px;cursor:pointer;"><i class="fas fa-layer-group"></i> Pilih Kelas</button>' +
    '</div><div class="produk-grid" id="produkGrid">';
  
  if (!produk || produk.length === 0) {
    html += '<div class="text-center" style="grid-column:1/-1;padding:50px;"><i class="fas fa-box-open" style="font-size:3rem;color:#95a5a6"></i><p style="color:#95a5a6;">Belum ada produk</p></div>';
  } else {
    for (var i = 0; i < produk.length; i++) {
      var p = produk[i];
      var disabled = p.stok <= 0 ? 'opacity:0.5;pointer-events:none;' : '';
      
      // Warna stok berdasarkan jumlah
      // Stok <= 5 = MERAH, 6-10 = KUNING, >10 = HIJAU
      var stokColor = "";
      if (p.stok <= 5) {
        stokColor = "#e74c3c"; // MERAH
      } else if (p.stok <= 10) {
        stokColor = "#f39c12"; // KUNING
      } else {
        stokColor = "#27ae60"; // HIJAU
      }
      
      // Ambil nama kelas dari kelasMap (global) atau dari hasil view string
      var kelasNames = [];
      if (Array.isArray(p.kelas_ids) && p.kelas_ids.length > 0) {
        for (var ki = 0; ki < p.kelas_ids.length; ki++) {
          var kid = p.kelas_ids[ki];
          if (window.kelasMap && window.kelasMap[kid]) kelasNames.push(window.kelasMap[kid]);
          else kelasNames.push(kid);
        }
      } else if (Array.isArray(p.kelas_names) && p.kelas_names.length > 0) {
        kelasNames = p.kelas_names;
      } else if (typeof p.kelas === 'string' && p.kelas.trim()) {
        kelasNames = p.kelas.split(/\s*,\s*/).filter(Boolean);
      } else if (p.kelas_id) {
        if (window.kelasMap && window.kelasMap[p.kelas_id]) kelasNames.push(window.kelasMap[p.kelas_id]);
        else kelasNames.push(p.kelas_id);
      }
      
      // Container badge (stok dan kelas SEJAJAR dengan ukuran SAMA)
      var badgesContainer = '<div style="display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap;">' +
        '<span style="display:inline-block;background:' + stokColor + ';color:white;font-size:11px;padding:4px 10px;border-radius:20px;font-weight:500;">Stok ' + p.stok + '</span>';
      
      if (kelasNames.length > 0) {
        for (var kn = 0; kn < kelasNames.length; kn++) {
          badgesContainer += '<span style="display:inline-block;background:#3498db;color:white;font-size:11px;padding:4px 10px;border-radius:20px;font-weight:500;">' + escapeHtml(kelasNames[kn]) + '</span>';
        }
      }
      
      badgesContainer += '</div>';
      
      // Encode produk dengan base64 untuk menghindari issue dengan quote dalam nama
      var produkEncoded = btoa(JSON.stringify(p));
      
      html += '<div class="produk-card" onclick="tambahLangsung(JSON.parse(atob(\'' + produkEncoded + '\')))" style="' + disabled + ';text-align:center;cursor:pointer;">' + 
        '<img src="' + (p.gambar_url || 'https://via.placeholder.com/150?text=Produk') + '" onerror="this.src=\'https://via.placeholder.com/150?text=Error\'" style="width:100%;height:150px;object-fit:cover;border-radius:8px;">' +
        '<h4 style="margin:10px 0 5px;font-size:14px;">' + p.nama + '</h4>' +
        '<p style="color:#e74c3c;font-weight:bold;margin:5px 0;font-size:13px;">Rp ' + Number(p.harga_jual).toLocaleString() + '</p>' +
        badgesContainer +
      '</div>';
    }
  }
  
  html += '</div></div><div class="cart-area" style="border-left:4px solid #d4af37;background:linear-gradient(180deg,#fef7e0 0%,#ffffff 100%);"><h3 style="display:flex;align-items:center;gap:10px;padding:18px 18px 16px;color:#1a5c3e;background:#f8f2d9;border-bottom:1px solid rgba(212,175,55,0.35);margin:0;"><i class="fas fa-shopping-cart" style="color:#d4af37;font-size:1.2rem;"></i> Keranjang Belanja<span class="cart-close" onclick="toggleCart()" style="background:#d4af37;color:#1a2e25;width:36px;height:36px;border-radius:50%;font-size:1rem;margin-left:auto;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.12);">✕</span></h3><div id="cartList"></div><div class="cart-footer"><h3>Total: <span id="totalBayar">Rp 0</span></h3>' +
    '<div class="form-group" style="margin-bottom:15px;">' +
      '<label style="display:block;margin-bottom:5px;font-weight:600;color:#2c3e50;"><i class="fas fa-user" style="color:#d4af37;"></i> Nama Pembeli</label>' +
      '<input type="text" class="form-control" id="namaPembeli" placeholder="Masukkan nama pembeli (opsional)" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd;">' +
    '</div>' +
    '<div class="form-group" style="margin-bottom:15px;">' +
      '<label style="display:block;margin-bottom:5px;font-weight:600;color:#2c3e50;"><i class="fas fa-money-bill-wave" style="color:#d4af37;"></i> Jumlah Uang</label>' +
      '<input type="number" class="form-control" id="uangBayar" placeholder="Masukkan jumlah uang" oninput="hitungKembalian()" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd;">' +
    '</div>' +
    '<h4 id="kembalian" style="color:var(--success);margin:10px 0;">Kembalian: Rp 0</h4>' +
    '<div style="display:flex;gap:10px;margin-top:10px;">' +
      '<button class="btn btn-danger" onclick="resetCart()" style="flex:1;"><i class="fas fa-trash-alt"></i> Reset Keranjang</button>' +
      '<button class="btn btn-success" onclick="prosesBayar()" style="flex:1;"><i class="fas fa-check-circle"></i> Proses Pembayaran</button>' +
    '</div>' +
  '</div></div></div><div class="cart-overlay" onclick="toggleCart()"></div><div class="cart-float" onclick="toggleCart()"><i class="fas fa-shopping-cart"></i><span id="cartCount">0</span></div>';
  
  document.getElementById("content").innerHTML = html;
  renderCart();
}

// Reset keranjang - menghapus semua item
function resetCart() {
  if (cart.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Keranjang Kosong',
      text: 'Tidak ada item dalam keranjang',
      timer: 1500,
      showConfirmButton: false
    });
    return;
  }
  
  Swal.fire({
    title: 'Reset Keranjang?',
    text: 'Semua item dalam keranjang akan dihapus!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Reset',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#e74c3c'
  }).then(function(result) {
    if (result.isConfirmed) {
      // Kosongkan array cart
      cart = [];
      // Render ulang keranjang
      renderCart();
      // Reset input uang bayar
      var uangBayar = document.getElementById("uangBayar");
      if (uangBayar) uangBayar.value = "";
      // Tampilkan notifikasi
      Swal.fire({
        icon: 'success',
        title: 'Keranjang Direset!',
        text: 'Semua item telah dihapus dari keranjang',
        timer: 1500,
        showConfirmButton: false
      });
    }
  });
}

async function showKelasModal() {
  var kelasData = await window.offlineCore.getAllKelas();
  var kelasList = kelasData.data || [];
  
  if (kelasList.length === 0) {
    Swal.fire({ icon: 'info', title: 'Tidak Ada Kelas', text: 'Belum ada data kelas. Tambah kelas terlebih dahulu di menu Master Kelas.' });
    return;
  }
  
  var buttonsHtml = '';
  for (var i = 0; i < kelasList.length; i++) {
    buttonsHtml += '<button class="kelas-btn" data-kelas="' + kelasList[i].id + '" data-nama="' + kelasList[i].nama_kelas + '" style="display:block;width:100%;margin:5px 0;padding:8px 12px;background:#3498db;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">' + kelasList[i].nama_kelas + '</button>';
  }
  buttonsHtml += '<button class="kelas-btn" data-kelas="all" data-nama="Semua" style="display:block;width:100%;margin:5px 0;padding:8px 12px;background:#27ae60;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;">SEMUA PRODUK</button>';
  
  Swal.fire({
    title: 'Pilih Kelas',
    html: '<div style="text-align:center;">' + buttonsHtml + '</div>',
    showConfirmButton: false,
    width: '250px',
    padding: '1em',
    didOpen: function() {
      var btns = document.querySelectorAll('.kelas-btn');
      for (var j = 0; j < btns.length; j++) {
        btns[j].onclick = function() {
          var kelasId = this.getAttribute('data-kelas');
          var namaKelas = this.getAttribute('data-nama');
          Swal.close();
          tambahProdukByKelas(kelasId, namaKelas);
        };
      }
    }
  });
}

async function tambahProdukByKelas(kelasId, namaKelas) {
  Swal.fire({ title: 'Memuat produk...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
  
  var produkData;
  if (kelasId === 'all') {
    produkData = await window.offlineCore.getProduk();
  } else {
    produkData = await window.offlineCore.getProdukByKelasId(kelasId);
  }
  
  var produkList = produkData.data || [];
  Swal.close();
  
  if (produkList.length === 0) {
    Swal.fire({ icon: 'info', title: 'Tidak Ada Produk', text: 'Tidak ada produk dalam kelas ' + namaKelas });
    return;
  }
  
  var stokHabis = [];
  var berhasil = 0;
  
  for (var i = 0; i < produkList.length; i++) {
    var p = produkList[i];
    if (p.stok <= 0) {
      stokHabis.push(p.nama);
      continue;
    }
    
    var existing = null;
    for (var j = 0; j < cart.length; j++) {
      if (cart[j].id === p.id) { existing = cart[j]; break; }
    }
    
    if (existing) {
      if (existing.qty + 1 <= p.stok) {
        existing.qty++;
        berhasil++;
      } else {
        stokHabis.push(p.nama + ' (stok ' + p.stok + ')');
      }
    } else {
      cart.push({
        id: p.id,
        qty: 1,
        nama: p.nama,
        harga_jual: p.harga_jual,
        harga_beli: p.harga_beli,
        stok: p.stok
      });
      berhasil++;
    }
  }
  
  renderCart();
  
  var message = '✅ ' + berhasil + ' produk ditambahkan ke keranjang';
  if (stokHabis.length > 0) {
    message += '\n\n⚠️ Stok habis: ' + stokHabis.join(', ');
  }
  
  Swal.fire({ icon: 'success', title: 'Berhasil', text: message, timer: 3000, showConfirmButton: true });
}

function tambahLangsung(produk) {
  if (produk.stok <= 0) { Swal.fire({ icon: 'warning', title: 'Stok Habis', text: 'Stok produk habis!' }); return; }
  var existing = null;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].id === produk.id) { existing = cart[i]; break; }
  }
  if (existing) {
    if (existing.qty >= produk.stok) { Swal.fire({ icon: 'warning', title: 'Stok Tidak Cukup', text: 'Stok tidak mencukupi!' }); return; }
    existing.qty++;
  } else {
    cart.push({ id: produk.id, qty: 1, nama: produk.nama, harga_jual: produk.harga_jual, harga_beli: produk.harga_beli, stok: produk.stok });
  }
  renderCart();
}

function ubahQty(id, perubahan) {
  var item = null;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].id === id) { item = cart[i]; break; }
  }
  if (!item) return;
  var newQty = item.qty + perubahan;
  if (newQty <= 0) {
    var newCart = [];
    for (var j = 0; j < cart.length; j++) {
      if (cart[j].id !== id) newCart.push(cart[j]);
    }
    cart = newCart;
  } else if (newQty <= item.stok) {
    item.qty = newQty;
  } else {
    Swal.fire({ icon: 'warning', title: 'Stok Tidak Cukup', text: 'Stok tidak mencukupi!' });
    return;
  }
  renderCart();
}

function renderCart() {
  var total = 0;
  var html = "";
  if (cart.length === 0) {
    html = '<div class="text-center" style="padding:30px;color:#95a5a6;"><i class="fas fa-shopping-cart" style="font-size:3rem;"></i><p style="margin-top:10px;">Keranjang kosong</p></div>';
  } else {
    for (var i = 0; i < cart.length; i++) {
      var item = cart[i];
      var subtotal = item.qty * item.harga_jual;
      total += subtotal;
      html += '<div class="cart-item"><div><strong>' + item.nama + '</strong><div style="font-size:0.9rem;">Rp ' + item.harga_jual.toLocaleString() + '</div></div><div class="qty-control"><button onclick="ubahQty(\'' + item.id + '\', -1)" class="btn-qty">-</button><span>' + item.qty + '</span><button onclick="ubahQty(\'' + item.id + '\', 1)" class="btn-qty">+</button></div><div style="font-weight:600;color:var(--secondary);">Rp ' + subtotal.toLocaleString() + '</div></div>';
    }
  }
  document.getElementById("cartList").innerHTML = html;
  document.getElementById("totalBayar").innerHTML = 'Rp ' + total.toLocaleString();
  var count = 0;
  for (var j = 0; j < cart.length; j++) count += cart[j].qty;
  var cartCountEl = document.getElementById("cartCount");
  if (cartCountEl) cartCountEl.innerText = count;
  hitungKembalian();
}

function hitungKembalian() {
  var uangInput = document.getElementById("uangBayar");
  var uang = uangInput ? (parseInt(uangInput.value) || 0) : 0;
  var total = 0;
  for (var i = 0; i < cart.length; i++) total += cart[i].qty * cart[i].harga_jual;
  var kembali = uang - total;
  var kembalianEl = document.getElementById("kembalian");
  if (kembalianEl) {
    if (kembali >= 0) {
      kembalianEl.innerHTML = 'Kembalian: <strong>Rp ' + kembali.toLocaleString() + '</strong>';
      kembalianEl.style.color = "var(--success)";
    } else {
      kembalianEl.innerHTML = 'Kurang: <strong>Rp ' + Math.abs(kembali).toLocaleString() + '</strong>';
      kembalianEl.style.color = "var(--danger)";
    }
  }
}

function filterProduk() {
  var keyword = document.getElementById("searchProduk").value.toLowerCase();
  var cards = document.querySelectorAll(".produk-card");
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var nama = card.querySelector("h4") ? card.querySelector("h4").innerText.toLowerCase() : "";
    card.style.display = nama.includes(keyword) ? "block" : "none";
  }
}

// ==================== PROSES BAYAR ====================
async function prosesBayar() {
  if (cart.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Keranjang Kosong', text: 'Tidak ada produk dalam keranjang' });
    return;
  }
  
  var uangBayar = parseInt(document.getElementById("uangBayar").value) || 0;
  var namaPembeli = document.getElementById("namaPembeli") ? document.getElementById("namaPembeli").value : "";
  
  var total = 0;
  for (var i = 0; i < cart.length; i++) {
    total += cart[i].qty * cart[i].harga_jual;
  }
  
  if (uangBayar < total) {
    Swal.fire({ icon: 'warning', title: 'Uang Kurang', text: 'Uang yang dibayarkan kurang!' });
    return;
  }
  
  var confirm = await Swal.fire({
    title: 'Konfirmasi Pembayaran',
    html: '<div style="text-align:left;">' +
      '<p><strong>Nama Pembeli:</strong> ' + (namaPembeli || '-') + '</p>' +
      '<p><strong>Total:</strong> Rp ' + total.toLocaleString() + '</p>' +
      '<p><strong>Bayar:</strong> Rp ' + uangBayar.toLocaleString() + '</p>' +
      '<p><strong>Kembali:</strong> Rp ' + (uangBayar - total).toLocaleString() + '</p>' +
      '</div>',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Proses',
    cancelButtonText: 'Batal'
  });
  
  if (!confirm.isConfirmed) return;
  
  // Gunakan toISOString() untuk standar, biarkan Supabase yang handle timezone
  var nowISO = new Date().toISOString();
  
  var total_laba = 0;
  for (var j = 0; j < cart.length; j++) {
    total_laba += cart[j].qty * (cart[j].harga_jual - cart[j].harga_beli);
  }
  
  var userId = localStorage.getItem("offline_user_id");
  
  var transaksiData = {
    total: total,
    total_laba: total_laba,
    nama_pembeli: namaPembeli || null,  // <-- PASTIKAN INI ADA
    created_at: nowISO,
    user_id: userId
  };
  
  console.log('📝 Sending transaction:', transaksiData);
  
  var result = await window.offlineCore.saveTransaksi(transaksiData, cart, userId);
  
  if (result.success) {
    var waktuFormatted = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    Swal.fire({
      icon: 'success',
      title: 'Transaksi Berhasil!',
      html: '<div style="text-align:left;">' +
        '<p><strong>Nama Pembeli:</strong> ' + (namaPembeli || '-') + '</p>' +
        '<p><strong>Total:</strong> Rp ' + total.toLocaleString() + '</p>' +
        '<p><strong>Bayar:</strong> Rp ' + uangBayar.toLocaleString() + '</p>' +
        '<p><strong>Kembali:</strong> Rp ' + (uangBayar - total).toLocaleString() + '</p>' +
        '<hr>' +
        '<p><strong>Waktu:</strong> ' + waktuFormatted + ' WIB</p>' +
        '</div>',
      timer: 3000,
      showConfirmButton: true
    });
    cart = [];
    loadKasir();
  } else {
    Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal memproses transaksi: ' + (result.error ? result.error.message : 'Unknown error') });
  }
}

function toggleCart() {
  var cartEl = document.querySelector(".cart-area");
  var overlay = document.querySelector(".cart-overlay");
  if (cartEl) cartEl.classList.toggle("show");
  if (overlay) overlay.classList.toggle("show");
}

// ==================== LAPORAN PENJUALAN ====================
async function loadLaporan() {
  setActiveMenu('laporan');
  document.getElementById("pageTitle").innerHTML = '<i class="fas fa-file-invoice"></i> Laporan Penjualan';
  
  // ========== PERBAIKAN: Gunakan waktu lokal komputer ==========
  var now = new Date();
  var today = now.getFullYear() + '-' + 
              String(now.getMonth() + 1).padStart(2, '0') + '-' + 
              String(now.getDate()).padStart(2, '0');
  
  var firstDayOfMonth = now.getFullYear() + '-' + 
                        String(now.getMonth() + 1).padStart(2, '0') + '-01';
  
  document.getElementById("content").innerHTML = `
    <div class="laporan-card">
      <div class="laporan-header">
        <h2><i class="fas fa-chart-line"></i> Laporan Penjualan</h2>
        <p class="laporan-subtitle">Analisis dan rekapan transaksi penjualan</p>
      </div>
      
      <div class="filter-section">
        <div class="filter-group">
          <label><i class="fas fa-calendar-alt"></i> Tanggal Mulai</label>
          <input type="date" id="tglMulai" class="filter-input" value="${firstDayOfMonth}">
        </div>
        <div class="filter-group">
          <label><i class="fas fa-calendar-check"></i> Tanggal Akhir</label>
          <input type="date" id="tglAkhir" class="filter-input" value="${today}">
        </div>
        <div class="filter-actions">
          <button class="btn-filter" onclick="generateLaporan()"><i class="fas fa-search"></i> Tampilkan</button>
          <button class="btn-export" onclick="exportLaporan()"><i class="fas fa-file-pdf"></i> Export PDF</button>
        </div>
      </div>
      
      <div id="hasilLaporan" class="laporan-result">
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Memuat data laporan...</p>
        </div>
      </div>
    </div>
  `;
  // Gunakan setTimeout untuk memastikan DOM sudah ter-render
  setTimeout(() => generateLaporan(), 100);
}

// ==================== AMBIL DATA TRANSAKSI DARI SUPABASE ====================
async function ambilDataTransaksiDariSupabase(startDate, endDate) {
  // Coba ambil dari Supabase dulu jika online
  if (navigator.onLine && window.sb) {
    try {
      console.log('[LAPORAN] Mengambil data dari Supabase...');
      
      var transaksiQuery = window.sb.from('transaksi').select('*');
      
      if (startDate) {
        transaksiQuery = transaksiQuery.gte('created_at', startDate + 'T00:00:00');
      }
      if (endDate) {
        transaksiQuery = transaksiQuery.lte('created_at', endDate + 'T23:59:59');
      }
      
      var { data: transaksi, error: trxErr } = await transaksiQuery;
      if (trxErr) throw trxErr;
      
      if (!transaksi || transaksi.length === 0) {
        console.log('[LAPORAN] Tidak ada data di Supabase');
        return [];
      }
      
      // Sort by created_at descending
      transaksi.sort(function(a, b) {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      // Fetch detail_transaksi untuk semua transaksi
      var allDetails = [];
      for (var i = 0; i < transaksi.length; i++) {
        var { data: details } = await window.sb
          .from('detail_transaksi')
          .select('*')
          .eq('transaksi_id', transaksi[i].id);
        if (details && details.length > 0) {
          allDetails = allDetails.concat(details);
        }
      }
      
      // Fetch produk untuk mapping
      var { data: produkList } = await window.sb.from('produk').select('*');
      var produkMap = {};
      if (produkList) {
        for (var pi = 0; pi < produkList.length; pi++) {
          var p = produkList[pi];
          if (p && p.id !== undefined) produkMap[p.id] = p;
        }
      }
      
      // Attach detail_transaksi ke masing-masing transaksi
      var result = transaksi.map(function(t) {
        var newT = Object.assign({}, t);
        newT.detail_transaksi = allDetails.filter(function(d) {
          return d.transaksi_id === t.id;
        }).map(function(d) {
          var nd = Object.assign({}, d);
          nd.produk = produkMap[d.produk_id] || null;
          return nd;
        });
        return newT;
      });
      
      console.log('[LAPORAN] Berhasil ambil', result.length, 'transaksi dari Supabase');
      return result;
      
    } catch (error) {
      console.warn('[LAPORAN] Gagal ambil dari Supabase, fallback ke local:', error.message);
    }
  }
  
  // Fallback ke local storage
  console.log('[LAPORAN] Mengambil data dari local storage...');
  var transaksiData = await window.offlineCore.getTransaksi(startDate, endDate);
  return transaksiData.data || [];
}

async function generateLaporan() {
  try {
    var hasilLaporan = document.getElementById("hasilLaporan");
    if (!hasilLaporan) {
      console.error('hasilLaporan element not found');
      return;
    }
    
    var mulai = document.getElementById("tglMulai")?.value;
    var akhir = document.getElementById("tglAkhir")?.value;
    
    if (!mulai || !akhir) { 
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Pilih tanggal terlebih dahulu!' }); 
      return; 
    }
    
    // Show loading
    hasilLaporan.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Memuat data dari server...</p></div>';
    
    // ========== PERBAIKAN: Ambil data dari Supabase langsung ==========
    var transaksi = await ambilDataTransaksiDariSupabase(mulai, akhir);
    
    if (!transaksi || transaksi.length === 0) {
      hasilLaporan.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-file-invoice"></i>
          <h3>Tidak Ada Data Transaksi</h3>
          <p>Belum ada transaksi pada periode ${formatTanggalIndonesia(mulai)} - ${formatTanggalIndonesia(akhir)}</p>
        </div>
      `;
      return;
    }
    
    var totalOmzet = 0, totalLaba = 0, totalItems = 0;
    for (var i = 0; i < transaksi.length; i++) {
      var t = transaksi[i];
      totalOmzet += Number(t.total || 0);
      totalLaba += Number(t.total_laba || 0);
      if (t.detail_transaksi) {
        for (var d = 0; d < t.detail_transaksi.length; d++) {
          totalItems += (t.detail_transaksi[d].qty || 0);
        }
      }
    }
    
    // Format tanggal WIB yang benar (gunakan waktu lokal komputer)
    function formatWIBDate(dateString) {
      if (!dateString) return '-';
      try {
        var date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        // Format lokal Indonesia (otomatis sesuai zona waktu komputer)
        return date.toLocaleString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch(e) {
        return dateString;
      }
    }
    
    var html = `
      <div class="stats-grid">
        <div class="stat-card stat-omzet">
          <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
          <div class="stat-info">
            <span class="stat-label">Total Omzet</span>
            <span class="stat-value">Rp ${totalOmzet.toLocaleString()}</span>
            <span class="stat-trend"><i class="fas fa-arrow-up"></i> +${((totalOmzet / (totalOmzet || 1)) * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div class="stat-card stat-laba">
          <div class="stat-icon"><i class="fas fa-chart-line"></i></div>
          <div class="stat-info">
            <span class="stat-label">Total Laba</span>
            <span class="stat-value">Rp ${totalLaba.toLocaleString()}</span>
            <span class="stat-trend success"><i class="fas fa-percent"></i> ${((totalLaba / (totalOmzet || 1)) * 100).toFixed(1)}% margin</span>
          </div>
        </div>
        <div class="stat-card stat-transaksi">
          <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
          <div class="stat-info">
            <span class="stat-label">Total Transaksi</span>
            <span class="stat-value">${transaksi.length}</span>
            <span class="stat-trend">${totalItems} item terjual</span>
          </div>
        </div>
        <div class="stat-card stat-rata">
          <div class="stat-icon"><i class="fas fa-chart-simple"></i></div>
          <div class="stat-info">
            <span class="stat-label">Rata-rata Transaksi</span>
            <span class="stat-value">Rp ${Math.round(totalOmzet / transaksi.length).toLocaleString()}</span>
            <span class="stat-trend">per transaksi</span>
          </div>
        </div>
      </div>
      
      <div class="transaksi-table-wrapper">
        <div class="table-header">
          <h3><i class="fas fa-list-ul"></i> Detail Transaksi</h3>
          <span class="table-count">${transaksi.length} transaksi ditemukan</span>
        </div>
        <div class="table-responsive">
          <table class="modern-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal & Waktu</th>
                <th>Nama Pembeli</th>
                <th>Total</th>
                <th>Laba</th>
                <th>Item</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    for (var j = 0; j < transaksi.length; j++) {
      var tr = transaksi[j];
      var itemCount = 0;
      if (tr.detail_transaksi) {
        for (var d2 = 0; d2 < tr.detail_transaksi.length; d2++) {
          itemCount += (tr.detail_transaksi[d2].qty || 0);
        }
      }
      
      var tglFormatted = formatWIBDate(tr.created_at);
      var namaPembeli = tr.nama_pembeli || '-';
      
      html += `
        <tr class="transaction-row">
          <td class="text-center">${j+1}</td>
          <td class="date-cell">${tglFormatted}</td>
          <td class="customer-cell"><span class="customer-name">${escapeHtml(namaPembeli)}</span></td>
          <td class="text-right amount">Rp ${Number(tr.total).toLocaleString()}</td>
          <td class="text-right profit">Rp ${Number(tr.total_laba).toLocaleString()}</td>
          <td class="text-center"><span class="item-badge">${itemCount}</span></td>
          <td class="text-center">
            <button class="action-btn" onclick="showDetailTransaksi('${tr.id}')">
              <i class="fas fa-receipt"></i> Nota
            </button>
          </td>
        </tr>
      `;
    }
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    hasilLaporan.innerHTML = html;
    
  } catch(error) {
    console.error('Error generating report:', error);
    var hasilLaporan = document.getElementById("hasilLaporan");
    if (hasilLaporan) {
      hasilLaporan.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Gagal Memuat Laporan</h3>
          <p>${error.message}</p>
          <button class="retry-btn" onclick="generateLaporan()"><i class="fas fa-sync-alt"></i> Coba Lagi</button>
        </div>
      `;
    }
  }
}


function formatTanggalIndonesia(dateStr) {
  if (!dateStr) return '-';
  var parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  var bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
               'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return parseInt(parts[2]) + ' ' + bulan[parseInt(parts[1]) - 1] + ' ' + parts[0];
}

async function showDetailTransaksi(id) {
  try {
    var transaksi = null;
    var detail = [];
    
    // Coba ambil dari Supabase dulu jika online
    if (navigator.onLine && window.sb) {
      try {
        var { data: trx, error: trxErr } = await window.sb
          .from('transaksi')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!trxErr && trx) {
          transaksi = trx;
          
          // Ambil detail transaksi
          var { data: details } = await window.sb
            .from('detail_transaksi')
            .select('*')
            .eq('transaksi_id', id);
          
          if (details && details.length > 0) {
            // Ambil data produk untuk mapping
            var produkIds = details.map(function(d) { return d.produk_id; }).filter(Boolean);
            var { data: produkList } = await window.sb
              .from('produk')
              .select('*')
              .in('id', produkIds);
            
            var produkMap = {};
            if (produkList) {
              produkList.forEach(function(p) { produkMap[p.id] = p; });
            }
            
            detail = details.map(function(d) {
              var nd = Object.assign({}, d);
              nd.produk = produkMap[d.produk_id] || null;
              return nd;
            });
          }
          
          console.log('[NOTA] Berhasil ambil dari Supabase:', id);
        }
      } catch (e) {
        console.warn('[NOTA] Gagal ambil dari Supabase:', e.message);
      }
    }
    
    // Fallback ke local storage jika tidak ditemukan di Supabase
    if (!transaksi) {
      var transaksiData = await window.offlineCore.getTransaksi();
      var allTransaksi = transaksiData.data || [];
      for (var i = 0; i < allTransaksi.length; i++) {
        if (allTransaksi[i].id === id) { 
          transaksi = allTransaksi[i]; 
          detail = transaksi.detail_transaksi || [];
          break; 
        }
      }
    }
    
    if (!transaksi) { Swal.fire({ icon: 'error', title: 'Error', text: 'Transaksi tidak ditemukan' }); return; }
    var totalBelanja = 0, totalItems = 0;
    for (var d = 0; d < detail.length; d++) {
      totalBelanja += Number(detail[d].subtotal || 0);
      totalItems += detail[d].qty || 0;
    }
    
    var tanggal = new Date(transaksi.created_at).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    var userName = localStorage.getItem("offline_user_name") || "Kasir";
    var namaPembeli = transaksi.nama_pembeli || 'Pelanggan';
    // Prepare share text for WhatsApp immediately and cache it to avoid async blocking later
    try {
      window.preparedNotaTexts = window.preparedNotaTexts || {};
      var shareText = `🏫 *MADIN AL-MUKTAMAR*\n`;
      shareText += `📍 *NOTA PENJUALAN*\n`;
      shareText += `══════════════════════\n`;
      shareText += `🆔 No: #${transaksi.id.slice(0,8)}\n`;
      shareText += `📅 Tanggal: ${tanggal}\n`;
      shareText += `👤 Pembeli: ${namaPembeli}\n`;
      shareText += `──────────────────────\n\n`;
      for (var sd = 0; sd < detail.length; sd++) {
        var it = detail[sd];
        shareText += `📦 *${it.produk?.nama || 'Produk'}*\n`;
        shareText += `   ${it.qty} x Rp ${Number(it.harga).toLocaleString()}\n`;
        shareText += `   ➤ Rp ${Number(it.subtotal).toLocaleString()}\n\n`;
      }
      var tot = detail.reduce(function(acc, cur){ return acc + Number(cur.subtotal || 0); }, 0);
      shareText += `──────────────────────\n`;
      shareText += `💰 *TOTAL: Rp ${tot.toLocaleString()}*\n`;
      shareText += `══════════════════════\n\n`;
      shareText += `🙏 Terima kasih atas kunjungan Anda!\n`;
      shareText += `📞 Info: 0812-3456-7890\n`;
      shareText += `${new Date().toLocaleString('id-ID')}`;
      window.preparedNotaTexts[transaksi.id] = shareText;
    } catch (e) {
      console.error('Prepare share text error:', e);
    }
    
    var notaHtml = `
      <div class="nota-modal" onclick="if(event.target===this) this.remove()">
        <div class="nota-container">
          <div class="nota-header">
            <div class="nota-logo">
              <div class="logo-circle">
                <i class="fas fa-book-open"></i>
              </div>
              <div class="logo-text">
                <h2>Madin Almuktamar</h2>
                <p>Pusat Kitab & Alat Tulis</p>
              </div>
            </div>
            <button class="nota-close" onclick="this.closest('.nota-modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="nota-body">
            <div class="nota-title-section">
              <h3>NOTA PENJUALAN</h3>
              <span class="nota-badge">#${transaksi.id.slice(0,8)}</span>
            </div>
            
            <div class="nota-info-grid">
              <div class="info-item">
                <i class="fas fa-calendar-alt"></i>
                <div>
                  <span class="info-label">Tanggal</span>
                  <span class="info-value">${tanggal}</span>
                </div>
              </div>
              <div class="info-item">
                <i class="fas fa-user"></i>
                <div>
                  <span class="info-label">Pembeli</span>
                  <span class="info-value">${escapeHtml(namaPembeli)}</span>
                </div>
              </div>
              <div class="info-item">
                <i class="fas fa-user-tie"></i>
                <div>
                  <span class="info-label">Kasir</span>
                  <span class="info-value">${userName}</span>
                </div>
              </div>
            </div>
            
            <div class="nota-divider"></div>
            
            <div class="nota-items">
              <table class="modern-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Harga</th>
                    <th class="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
    `;
    
    for (var d2 = 0; d2 < detail.length; d2++) {
      var item = detail[d2];
      notaHtml += `
        <tr>
          <td>${escapeHtml(item.produk?.nama || 'Produk')}</td>
          <td class="text-center">${item.qty}</td>
          <td class="text-right">Rp ${Number(item.harga).toLocaleString()}</td>
          <td class="text-right">Rp ${Number(item.subtotal).toLocaleString()}</td>
        </tr>
      `;
    }
    
    notaHtml += `
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td colspan="3" class="text-right"><strong>TOTAL</strong></td>
                    <td class="text-right total-amount">Rp ${totalBelanja.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div class="nota-footer-actions">
              <button class="share-wa-btn" onclick="shareCustomerNotaDirect('${transaksi.id}')">
                <i class="fab fa-whatsapp"></i> WhatsApp
              </button>
              <button class="print-nota-btn" onclick="printNota('${transaksi.id}')">
                <i class="fas fa-print"></i> Print
              </button>
            </div>
            
            <div class="nota-thanks">
              <p>Terima kasih atas kunjungan Anda!</p>
              <p class="small">Barang yang sudah dibeli tidak dapat dikembalikan</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', notaHtml);
  } catch(error) {
    console.error('Error showing detail:', error);
    Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
  }
}

async function printNota(id) {
  try {
    var transaksiData = await window.offlineCore.getTransaksi();
    var allTransaksi = transaksiData.data || [];
    var transaksi = null;
    for (var i = 0; i < allTransaksi.length; i++) {
      if (allTransaksi[i].id === id) { transaksi = allTransaksi[i]; break; }
    }
    if (!transaksi) { Swal.fire({ icon: 'error', title: 'Error', text: 'Transaksi tidak ditemukan' }); return; }
    
    var detail = transaksi.detail_transaksi || [];
    var totalBelanja = 0;
    for (var d = 0; d < detail.length; d++) {
      totalBelanja += Number(detail[d].subtotal || 0);
    }
    
    var tanggal = new Date(transaksi.created_at).toLocaleString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    
    var namaPembeli = transaksi.nama_pembeli || 'Pelanggan';
    var userName = localStorage.getItem("offline_user_name") || "Kasir";
    
    var printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nota Penjualan</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', 'Monaco', monospace;
            background: white;
            padding: 20px;
            display: flex;
            justify-content: center;
          }
          .nota-print {
            max-width: 350px;
            width: 100%;
            background: white;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px dashed #333;
            padding-bottom: 10px;
          }
          .header h2 { font-size: 16px; margin-bottom: 4px; }
          .header p { font-size: 10px; color: #666; }
          .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin: 4px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10px;
          }
          .items-table th, .items-table td {
            padding: 6px 2px;
            border-bottom: 1px dotted #ccc;
            text-align: left;
          }
          .items-table td.text-right { text-align: right; }
          .items-table td.text-center { text-align: center; }
          .total-row td { border-top: 2px dashed #333; padding-top: 8px; font-weight: bold; }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px dashed #333;
            font-size: 9px;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
        </style>
      </head>
      <body>
        <div class="nota-print">
          <div class="header">
            <h2>MADIN AL-MUKTAMAR</h2>
            <p>Pusat Kitab & Alat Tulis</p>
            <p>${new Date().toLocaleDateString('id-ID')}</p>
          </div>
          
          <div class="info-row"><span>No. Transaksi</span><span>#${transaksi.id.slice(0,8)}</span></div>
          <div class="info-row"><span>Tanggal</span><span>${tanggal}</span></div>
          <div class="info-row"><span>Pembeli</span><span>${escapeHtml(namaPembeli)}</span></div>
          <div class="info-row"><span>Kasir</span><span>${userName}</span></div>
          
          <table class="items-table">
            <thead>
              <tr><th>Produk</th><th class="text-center">Qty</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th></tr>
            </thead>
            <tbody>
    `;
    
    for (var d2 = 0; d2 < detail.length; d2++) {
      var item = detail[d2];
      printHtml += `
        <tr>
          <td>${escapeHtml(item.produk?.nama || 'Produk')}</td>
          <td class="text-center">${item.qty}</td>
          <td class="text-right">Rp ${Number(item.harga).toLocaleString()}</td>
          <td class="text-right">Rp ${Number(item.subtotal).toLocaleString()}</td>
        </tr>
      `;
    }
    
    printHtml += `
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" class="text-right"><strong>TOTAL</strong></td>
                <td class="text-right"><strong>Rp ${totalBelanja.toLocaleString()}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <div class="footer">
            <p>Terima kasih telah berbelanja!</p>
            <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
          </div>
        </div>
        <script>
          window.print();
          setTimeout(function() { window.close(); }, 500);
        <\/script>
      </body>
      </html>
    `;
    
    var printWindow = window.open('', '_blank');
    if (printWindow && printWindow.document) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } else {
      // Fallback when popup is blocked: create a hidden iframe and print from it
      var iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
      var iw = iframe.contentWindow || iframe;
      try {
        iw.document.open();
        iw.document.write(printHtml);
        iw.document.close();
      } catch (e) {
        console.error('Print iframe error:', e);
        document.body.removeChild(iframe);
        throw e;
      }
      // remove iframe after a short delay to allow print to complete
      setTimeout(function() { try { document.body.removeChild(iframe); } catch (e) {} }, 2000);
    }
  } catch(error) {
    console.error('Print error:', error);
    Swal.fire({ icon: 'error', title: 'Gagal Print', text: error.message });
  }
}

async function shareCustomerNota(id) {
  try {
    Swal.fire({ title: 'Menyiapkan Nota...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    // Use pre-prepared text if available (prepared when nota modal was created)
    var text = (window.preparedNotaTexts && window.preparedNotaTexts[id]) || null;
    if (!text) {
      // Fallback: build text from local transaksi store
      var transaksiData = await window.offlineCore.getTransaksi();
      var allTransaksi = transaksiData.data || [];
      var transaksi = null;
      for (var i = 0; i < allTransaksi.length; i++) {
        if (allTransaksi[i].id === id) { transaksi = allTransaksi[i]; break; }
      }
      Swal.close();
      if (!transaksi) { Swal.fire({ icon: 'error', title: 'Error', text: 'Transaksi tidak ditemukan' }); return; }

      var detail = transaksi.detail_transaksi || [];
      var namaPembeli = transaksi.nama_pembeli || 'Pelanggan';
      var tanggal = new Date(transaksi.created_at).toLocaleString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      text = `🏫 *MADIN AL-MUKTAMAR*\n`;
      text += `📍 *NOTA PENJUALAN*\n`;
      text += `══════════════════════\n`;
      text += `🆔 No: #${transaksi.id.slice(0,8)}\n`;
      text += `📅 Tanggal: ${tanggal}\n`;
      text += `👤 Pembeli: ${namaPembeli}\n`;
      text += `──────────────────────\n\n`;
      for (var d = 0; d < detail.length; d++) {
        text += `📦 *${detail[d].produk?.nama || 'Produk'}*\n`;
        text += `   ${detail[d].qty} x Rp ${Number(detail[d].harga).toLocaleString()}\n`;
        text += `   ➤ Rp ${Number(detail[d].subtotal).toLocaleString()}\n\n`;
      }
      var total = detail.reduce(function(acc, cur){ return acc + Number(cur.subtotal || 0); }, 0);
      text += `──────────────────────\n`;
      text += `💰 *TOTAL: Rp ${total.toLocaleString()}*\n`;
      text += `══════════════════════\n\n`;
      text += `🙏 Terima kasih atas kunjungan Anda!\n`;
      text += `📞 Info: 0812-3456-7890\n`;
      text += `${new Date().toLocaleString('id-ID')}`;
    } else {
      Swal.close();
    }

    // Encode untuk WhatsApp. API URL membuka WhatsApp Web di desktop dan bisa mengalihkan ke aplikasi WA di mobile.
    var waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);

    var result = await Swal.fire({
      title: 'Bagikan Nota',
      html: `
        <div style="text-align: left;">
          <p>Nota akan dibagikan ke WhatsApp:</p>
          <div style="background: #f0f0f0; padding: 10px; border-radius: 8px; font-size: 11px; max-height: 200px; overflow: auto;">
            <pre style="white-space: pre-wrap; font-family: monospace;">${text.substring(0, 300)}...</pre>
          </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: '<i class="fab fa-whatsapp"></i> Buka WhatsApp',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      // Open WhatsApp in a new tab/window as a direct user action
      var a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  } catch(err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: 'Gagal Share', text: 'Gagal membagikan nota ke WhatsApp' });
  }
}

function shareCustomerNotaDirect(id) {
  try {
    console.log('shareCustomerNotaDirect called', { id: id, preparedExists: !!(window.preparedNotaTexts && window.preparedNotaTexts[id]), isTauri: !!window.isTauri, hasTauriGlobal: !!window.__TAURI__ });
    var text = (window.preparedNotaTexts && window.preparedNotaTexts[id]) || null;
    if (!text) {
      Swal.fire({ icon: 'warning', title: 'Belum Siap', text: 'Nota belum disiapkan. Buka kembali nota terlebih dahulu.' });
      return;
    }

    // API URL works on desktop by opening WhatsApp Web, and on mobile may open the native app.
    var waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);

    // Provide user feedback that we're attempting to open WhatsApp
    Swal.fire({ title: 'Membuka WhatsApp...', timer: 1000, showConfirmButton: false, didOpen: () => Swal.showLoading() });

    if (window.isTauri && window.__TAURI__ && window.__TAURI__.shell && typeof window.__TAURI__.shell.open === 'function') {
      try {
        window.__TAURI__.shell.open(waUrl);
        return;
      } catch (e) {
        console.error('Tauri shell open failed:', e);
      }
    }

    // Fallbacks: anchor click, then window.open
    try {
      var a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    } catch (e) {
      console.error('Anchor click failed:', e);
    }

    try {
      window.open(waUrl, '_blank');
      return;
    } catch (e) {
      console.error('window.open failed:', e);
    }

    Swal.fire({ icon: 'error', title: 'Gagal', text: 'Tidak dapat membuka WhatsApp pada lingkungan ini.' });
  } catch (e) {
    console.error('Direct share error:', e);
    Swal.fire({ icon: 'error', title: 'Gagal', text: 'Tidak dapat membuka WhatsApp' });
  }
}

async function exportLaporan() {
  try {
    var jsPDF = window.jspdf.jsPDF;
    var mulai = document.getElementById("tglMulai").value;
    var akhir = document.getElementById("tglAkhir").value;
    
    if (!mulai || !akhir) { 
      Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Pilih tanggal terlebih dahulu!' }); 
      return; 
    }
    
    Swal.fire({ 
      title: 'Menyiapkan PDF...', 
      text: 'Mohon tunggu sebentar', 
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading() 
    });
    
    var transaksiData = await window.offlineCore.getTransaksi(mulai, akhir);
    var transaksi = transaksiData.data || [];
    
    if (!transaksi || transaksi.length === 0) {
      Swal.close();
      Swal.fire({ icon: 'warning', title: 'Tidak Ada Data', text: 'Tidak ada transaksi pada periode ini' });
      return;
    }
    
    // Ambil data produk untuk mapping
    var produkData = await window.offlineCore.getProduk();
    var produkMap = {};
    if (produkData && produkData.data) {
      for (var p = 0; p < produkData.data.length; p++) {
        var prod = produkData.data[p];
        produkMap[prod.id] = {
          nama: prod.nama || 'Produk',
          harga_beli: prod.harga_beli || 0,
          harga_jual: prod.harga_jual || 0
        };
      }
    }
    
    // Lengkapi detail transaksi dengan info produk
    for (var i = 0; i < transaksi.length; i++) {
      var t = transaksi[i];
      if (t.detail_transaksi) {
        for (var d = 0; d < t.detail_transaksi.length; d++) {
          var det = t.detail_transaksi[d];
          var produkInfo = det.produk_id && produkMap[det.produk_id];
          
          if (!det.nama_produk && produkInfo) {
            det.nama_produk = produkInfo.nama;
          }
          if (!det.nama_produk && det.produk && det.produk.nama) {
            det.nama_produk = det.produk.nama;
          }
          if (!det.nama_produk && det.nama) {
            det.nama_produk = det.nama;
          }
          
          if (!det.harga_beli && produkInfo) {
            det.harga_beli = produkInfo.harga_beli;
          }
          if (!det.harga_jual && det.harga) {
            det.harga_jual = det.harga;
          }
          if (!det.harga_jual && produkInfo) {
            det.harga_jual = produkInfo.harga_jual;
          }
        }
      }
    }
    
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pageWidth = doc.internal.pageSize.width;
    var pageHeight = doc.internal.pageSize.height;
    
    // Load logo
    var logoDataUrl = null;
    var logoSources = ['src/icons/logo.png', 'https://i.imgur.com/2mDfHEi.png'];
    for (var li = 0; li < logoSources.length; li++) {
      try {
        var logoResponse = await fetch(logoSources[li], { mode: 'cors' });
        if (!logoResponse.ok) continue;
        var contentType = logoResponse.headers && logoResponse.headers.get ? logoResponse.headers.get('content-type') : null;
        if (contentType && contentType.indexOf('image') === -1) continue;
        var logoBlob = await logoResponse.blob();
        if (!logoBlob || !logoBlob.size || logoBlob.size < 200) continue;
        var reader = new FileReader();
        logoDataUrl = await new Promise(function(resolve, reject) {
          reader.onload = function() { resolve(reader.result); };
          reader.onerror = function(err) { reject(err); };
          reader.readAsDataURL(logoBlob);
        });
        if (logoDataUrl) break;
      } catch (err) {
        console.warn('Logo load failed for', logoSources[li], err);
        logoDataUrl = null;
      }
    }
    
    // Kompres logo
    if (logoDataUrl && typeof logoDataUrl === 'string' && logoDataUrl.indexOf('data:image/') === 0) {
      try {
        var imgEl = document.createElement('img');
        imgEl.src = logoDataUrl;
        await new Promise(function(resolve, reject) {
          imgEl.onload = resolve;
          imgEl.onerror = reject;
        });
        
        var maxDim = 300;
        var scale = Math.min(1, maxDim / Math.max(imgEl.naturalWidth || imgEl.width, imgEl.naturalHeight || imgEl.height));
        var cw = Math.round((imgEl.naturalWidth || imgEl.width) * scale);
        var ch = Math.round((imgEl.naturalHeight || imgEl.height) * scale);
        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(imgEl, 0, 0, cw, ch);
        logoDataUrl = canvas.toDataURL('image/png');
      } catch (e) {
        console.warn('Logo compression failed, using original:', e);
      }
    }

    // Header dokumen Hijau Emas (hanya di halaman pertama)
    doc.setFillColor(18, 99, 58);
    doc.rect(0, 0, pageWidth, 22, 'F');
    
    // Posisi logo
    var logoX = 8;
    var logoY = 4;
    var logoWidth = 14;
    var logoHeight = 16;
    
    if (logoDataUrl && typeof logoDataUrl === 'string' && logoDataUrl.indexOf('data:image/') === 0) {
      try {
        var isPng = logoDataUrl.indexOf('image/png') !== -1;
        var imgFormat = isPng ? 'PNG' : 'JPEG';
        doc.addImage(logoDataUrl, imgFormat, logoX, logoY, logoWidth, logoHeight, undefined, 'NONE');
      } catch (err) {
        console.warn('Skipping invalid logo image:', err);
      }
    }
    
    var textStartX = logoDataUrl ? (logoX + logoWidth + 4) : 10;
    
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 238, 160);
    doc.text('MADIN AL-MUKTAMAR', textStartX, 10);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 170);
    doc.text('Pusat Kitab & Alat Tulis', textStartX, 16);
    
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 170);
    var tglMulaiFormatted = formatTanggalIndonesia(mulai);
    var tglAkhirFormatted = formatTanggalIndonesia(akhir);
    doc.text(`Periode: ${tglMulaiFormatted} - ${tglAkhirFormatted}`, pageWidth - 10, 10, { align: 'right' });
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth - 10, 16, { align: 'right' });
    
    doc.setDrawColor(204, 181, 71);
    doc.setLineWidth(0.3);
    doc.line(8, 22, pageWidth - 8, 22);
    
    // Hitung total keseluruhan untuk ringkasan akhir
    var totalOmzet = 0, totalLaba = 0, totalItems = 0, totalModalSemua = 0;
    for (var i = 0; i < transaksi.length; i++) {
      var t = transaksi[i];
      totalOmzet += Number(t.total || 0);
      totalLaba += Number(t.total_laba || 0);
      if (t.detail_transaksi) {
        for (var d = 0; d < t.detail_transaksi.length; d++) {
          var det = t.detail_transaksi[d];
          var qty = det.qty || 0;
          totalItems += qty;
          var modalItem = (det.harga_beli || 0) * qty;
          totalModalSemua += modalItem;
        }
      }
    }
    
    var marginRata = totalOmzet > 0 ? ((totalLaba / totalOmzet) * 100).toFixed(1) : 0;
    
    // Kumpulkan semua detail produk
    var semuaDetailProduk = [];
    for (var idx = 0; idx < transaksi.length; idx++) {
      var t = transaksi[idx];
      var tgl = new Date(t.created_at).toLocaleDateString('id-ID');
      
      if (t.detail_transaksi) {
        for (var d = 0; d < t.detail_transaksi.length; d++) {
          var det = t.detail_transaksi[d];
          var qty = det.qty || 0;
          var hargaModal = det.harga_beli || 0;
          var hargaJual = det.harga_jual || 0;
          var totalJual = hargaJual * qty;
          var labaItem = totalJual - (hargaModal * qty);
          var namaProduk = det.nama_produk || '-';
          
          semuaDetailProduk.push([
            (semuaDetailProduk.length + 1).toString(),
            tgl,
            namaProduk,
            qty.toString(),
            'Rp ' + hargaModal.toLocaleString(),
            'Rp ' + hargaJual.toLocaleString(),
            'Rp ' + labaItem.toLocaleString(),
            'Rp ' + totalJual.toLocaleString()
          ]);
        }
      }
    }
    
    // Tabel dengan showHead: 'firstPage'
    if (semuaDetailProduk.length > 0) {
      doc.autoTable({
        startY: 28,
        head: [['No', 'Tgl', 'Nama Produk', 'Qty', 'Modal', 'Harga Jual', 'Laba', 'Total']],
        body: semuaDetailProduk,
        theme: 'striped',
        headStyles: {
          fillColor: [18, 99, 58],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8,
          cellPadding: 3
        },
        bodyStyles: { fontSize: 7.5, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 45, halign: 'left' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 25, halign: 'right' },
          7: { cellWidth: 28, halign: 'right' }
        },
        alternateRowStyles: { fillColor: [240, 248, 240] },
        margin: { left: 8, right: 8 },
        showHead: 'firstPage',
        didDrawPage: function(data) {
          var pageCount = doc.getNumberOfPages();
          var currentPageHeight = doc.internal.pageSize.height;
          
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.setFont('helvetica', 'normal');
          doc.text('Madin Al-Muktamar', 8, currentPageHeight - 6);
          doc.text('Page ' + data.pageNumber + ' / ' + pageCount, pageWidth - 8, currentPageHeight - 6, { align: 'right' });
        }
      });
      
      var finalY = doc.lastAutoTable.finalY + 10;
      var summaryBoxWidth = 72;
      var summaryBoxHeight = 56;
      var summaryX = pageWidth - 8 - summaryBoxWidth;
      var summaryY = finalY;
      
      if (summaryY + summaryBoxHeight > pageHeight - 15) {
        doc.addPage();
        summaryY = 20;
      }
      
      doc.setFillColor(247, 244, 229);
      doc.setDrawColor(204, 181, 71);
      doc.setLineWidth(0.5);
      doc.roundedRect(summaryX, summaryY, summaryBoxWidth, summaryBoxHeight, 4, 4, 'FD');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(18, 99, 58);
      doc.text('RINGKASAN LAPORAN', summaryX + 4, summaryY + 8, { align: 'left' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      var poinStartY = summaryY + 16;
      var lineHeight = 7;
      var colonX = summaryX + summaryBoxWidth / 2;
      var valueX = summaryX + summaryBoxWidth - 4;
      
      var ringkasanData = [
        { label: 'Total Transaksi', value: transaksi.length + ' transaksi' },
        { label: 'Total Item Terjual', value: totalItems + ' item' },
        { label: 'Total Modal (HPP)', value: 'Rp ' + totalModalSemua.toLocaleString() },
        { label: 'Total Omzet', value: 'Rp ' + totalOmzet.toLocaleString() },
        { label: 'Total Laba', value: 'Rp ' + totalLaba.toLocaleString() },
        { label: 'Margin Rata-rata', value: marginRata + ' %' }
      ];
      
      for (var s = 0; s < ringkasanData.length; s++) {
        var item = ringkasanData[s];
        var yPos = poinStartY + (s * lineHeight);
        
        doc.setFont('helvetica', 'bold');
        doc.text(item.label, summaryX + 4, yPos);
        
        doc.setFont('helvetica', 'normal');
        doc.text(':', colonX, yPos, { align: 'center' });
        doc.text(item.value, valueX, yPos, { align: 'right' });
      }
      
      var footerY = pageHeight - 8;
      doc.setFontSize(6);
      doc.setTextColor(18, 99, 58);
      doc.setFont('helvetica', 'italic');
      
      
    } else {
      doc.setFontSize(11);
      doc.setTextColor(231, 76, 60);
      doc.text('Tidak ada data', pageWidth / 2, 50, { align: 'center' });
    }
    
    Swal.close();
    
    var pdfBlob = doc.output('blob');
    var fileName = `Laporan_Produk_${mulai}_sd_${akhir}.pdf`;
    
    var result = await Swal.fire({
      title: 'PDF Selesai',
      html: 'Laporan berhasil dibuat.',
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Lihat',
      confirmButtonColor: '#27ae60',
      cancelButtonColor: '#3498db'
    });
    
    if (result.isConfirmed) {
      var link = document.createElement('a');
      var url = URL.createObjectURL(pdfBlob);  // <-- PERBAIKAN: pdfBlob (bukan pdfBloc)
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else {
      var url = URL.createObjectURL(pdfBlob);  // <-- PERBAIKAN: pdfBlob (bukan pdfBloc)
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    
  } catch(error) {
    console.error('Error exporting PDF:', error);
    Swal.close();
    Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
  }
}

// ==================== LAPORAN MASTER DATA (DENGAN NAMA KELAS) ====================
async function loadLaporanMaster() {
  setActiveMenu('laporan-master');
  document.getElementById("pageTitle").innerHTML = '<i class="fas fa-database"></i> Laporan Master Data';
  
  // Load kelas map untuk mapping kelas_id ke nama kelas
  var kelasData = await window.offlineCore.getAllKelas();
  var kelasList = kelasData.data || [];
  window.kelasMap = {};
  for (var i = 0; i < kelasList.length; i++) {
    window.kelasMap[kelasList[i].id] = kelasList[i].nama_kelas;
  }
  
  var produkData = await window.offlineCore.getProduk();
  var produk = produkData.data || [];
  
  var totalModal = 0, totalJual = 0, totalStok = 0;
  for (var i = 0; i < produk.length; i++) {
    var p = produk[i];
    totalModal += (p.harga_beli || 0) * (p.stok || 0);
    totalJual += (p.harga_jual || 0) * (p.stok || 0);
    totalStok += (p.stok || 0);
  }
  var totalLaba = totalJual - totalModal;
  var marginRata = totalJual > 0 ? ((totalLaba / totalJual) * 100).toFixed(1) : 0;
  
  var html = '<div class="card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;flex-wrap:wrap;gap:10px;">' +
      '<h2 style="margin:0;"><i class="fas fa-database"></i> Laporan Master Data</h2>' +
      '<button class="btn btn-success" onclick="exportMasterDataPDF()" style="padding:8px 16px;font-size:0.85rem;">' +
        '<i class="fas fa-file-pdf"></i> Export PDF</button>' +
    '</div>' +
    '<div class="summary-cards master-summary">' +
      '<div class="summary-card" style="background:linear-gradient(135deg,#1a5c3e,#d4af37);color:white;padding:12px;">' +
        '<div class="card-icon" style="background:rgba(255,255,255,0.2);width:36px;height:36px;font-size:1rem;"><i class="fas fa-boxes"></i></div>' +
        '<div class="card-content">' +
          '<span class="card-label" style="color:rgba(255,255,255,0.9);font-size:0.75rem;">Total Produk</span>' +
          '<span class="card-value" style="font-size:1.5rem;font-weight:700;">' + produk.length + '</span>' +
          '<span class="card-period" style="color:rgba(255,255,255,0.8);font-size:0.7rem;">' + totalStok + ' item stok</span>' +
        '</div>' +
      '</div>' +
      '<div class="summary-card" style="background:linear-gradient(135deg,#e74c3c,#c0392b);color:white;padding:12px;">' +
        '<div class="card-icon" style="background:rgba(255,255,255,0.2);width:36px;height:36px;font-size:1rem;"><i class="fas fa-coins"></i></div>' +
        '<div class="card-content">' +
          '<span class="card-label" style="color:rgba(255,255,255,0.9);font-size:0.75rem;">Nilai Modal</span>' +
          '<span class="card-value" style="font-size:1.2rem;font-weight:700;">Rp ' + totalModal.toLocaleString() + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="summary-card" style="background:linear-gradient(135deg,#27ae60,#219a52);color:white;padding:12px;">' +
        '<div class="card-icon" style="background:rgba(255,255,255,0.2);width:36px;height:36px;font-size:1rem;"><i class="fas fa-tag"></i></div>' +
        '<div class="card-content">' +
          '<span class="card-label" style="color:rgba(255,255,255,0.9);font-size:0.75rem;">Nilai Jual</span>' +
          '<span class="card-value" style="font-size:1.2rem;font-weight:700;">Rp ' + totalJual.toLocaleString() + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="summary-card" style="background:linear-gradient(135deg,#f39c12,#e67e22);color:white;padding:12px;">' +
        '<div class="card-icon" style="background:rgba(255,255,255,0.2);width:36px;height:36px;font-size:1rem;"><i class="fas fa-chart-line"></i></div>' +
        '<div class="card-content">' +
          '<span class="card-label" style="color:rgba(255,255,255,0.9);font-size:0.75rem;">Potensi Laba</span>' +
          '<span class="card-value" style="font-size:1.2rem;font-weight:700;">Rp ' + totalLaba.toLocaleString() + '</span>' +
          '<span class="card-badge" style="background:rgba(255,255,255,0.2);padding:2px 6px;border-radius:12px;font-size:0.65rem;">Margin ' + marginRata + '%</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="table-responsive">' +
      '<table class="modern-table">' +
        '<thead>' +
          '<tr>' +
            '<th>No</th>' +
            '<th>Nama Produk</th>' +
            '<th>Kelas</th>' +
            '<th class="text-right">Modal</th>' +
            '<th class="text-right">Harga Jual</th>' +
            '<th class="text-center">Stok</th>' +
            '<th class="text-right">Total Modal</th>' +
            '<th class="text-right">Total Jual</th>' +
            '<th class="text-right">Laba</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';
  
  for (var j = 0; j < produk.length; j++) {
    var pr = produk[j];
    var totalModalItem = (pr.harga_beli || 0) * (pr.stok || 0);
    var totalJualItem = (pr.harga_jual || 0) * (pr.stok || 0);
    var labaItem = totalJualItem - totalModalItem;
    var marginClass = labaItem > 0 ? 'text-success' : (labaItem < 0 ? 'text-danger' : '');
    
    // Ambil nama kelas dari kelasMap, dukung multi-kelas dan view string
    var laporanKelasNames = [];
    if (Array.isArray(pr.kelas_ids) && pr.kelas_ids.length > 0) {
      for (var ki = 0; ki < pr.kelas_ids.length; ki++) {
        var kid = pr.kelas_ids[ki];
        if (window.kelasMap && window.kelasMap[kid]) laporanKelasNames.push(window.kelasMap[kid]);
        else laporanKelasNames.push(kid);
      }
    } else if (Array.isArray(pr.kelas_names) && pr.kelas_names.length > 0) {
      laporanKelasNames = pr.kelas_names;
    } else if (typeof pr.kelas === 'string' && pr.kelas.trim()) {
      laporanKelasNames = pr.kelas.split(/\s*,\s*/).filter(Boolean);
    } else if (pr.kelas_id) {
      if (window.kelasMap && window.kelasMap[pr.kelas_id]) laporanKelasNames.push(window.kelasMap[pr.kelas_id]);
      else laporanKelasNames.push(pr.kelas_id);
    }
    var namaKelas = laporanKelasNames.length > 0 ? laporanKelasNames.join(', ') : '-';
    
    html += '<tr>' +
      '<td class="text-center">' + (j+1) + '</td>' +
      '<td><strong>' + escapeHtml(pr.nama) + '</strong></td>' +
      '<td class="text-center"><span  style="padding:4px 8px;border-radius:12px;font-size:11px;">' + escapeHtml(namaKelas) + '</span></td>' +
      '<td class="text-right">Rp ' + (pr.harga_beli || 0).toLocaleString() + '</td>' +
      '<td class="text-right">Rp ' + (pr.harga_jual || 0).toLocaleString() + '</td>' +
      '<td class="text-center"><span class="stok-badge ' + (pr.stok > 10 ? 'badge-success' : (pr.stok > 0 ? 'badge-warning' : 'badge-danger')) + '">' + (pr.stok || 0) + '</span></td>' +
      '<td class="text-right">Rp ' + totalModalItem.toLocaleString() + '</td>' +
      '<td class="text-right">Rp ' + totalJualItem.toLocaleString() + '</td>' +
      '<td class="text-right ' + marginClass + '"><strong>Rp ' + labaItem.toLocaleString() + '</strong></td>' +
    '</tr>';
  }
  
  html += '</tbody><tfoot><tr class="total-row">' +
    '<td colspan="6"><strong>TOTAL KESELURUHAN</strong></td>' +
    '<td class="text-right"><strong>Rp ' + totalModal.toLocaleString() + '</strong></td>' +
    '<td class="text-right"><strong>Rp ' + totalJual.toLocaleString() + '</strong></td>' +
    '<td class="text-right"><strong>Rp ' + totalLaba.toLocaleString() + '</strong></td>' +
  '</tr></tfoot></table></div></div>';
  
  document.getElementById("content").innerHTML = html;
}

// ==================== EXPORT MASTER DATA PDF ====================
async function exportMasterDataPDF() {
  try {
    var jsPDF = window.jspdf.jsPDF;
    
    Swal.fire({ 
      title: 'Menyiapkan PDF...', 
      text: 'Mohon tunggu sebentar', 
      allowOutsideClick: false, 
      didOpen: function() { 
        Swal.showLoading(); 
      } 
    });
    
    // Load kelas map
    var kelasData = await window.offlineCore.getAllKelas();
    var kelasList = kelasData.data || [];
    var kelasMap = {};
    for (var i = 0; i < kelasList.length; i++) {
      kelasMap[kelasList[i].id] = kelasList[i].nama_kelas;
    }
    
    var produkData = await window.offlineCore.getProduk();
    var produk = produkData.data || [];
    
    if (!produk || produk.length === 0) {
      Swal.close();
      Swal.fire({ icon: 'warning', title: 'Tidak Ada Data', text: 'Belum ada data produk' });
      return;
    }
    
    var totalModal = 0, totalJual = 0, totalStok = 0;
    for (var i = 0; i < produk.length; i++) {
      var p = produk[i];
      totalModal += (p.harga_beli || 0) * (p.stok || 0);
      totalJual += (p.harga_jual || 0) * (p.stok || 0);
      totalStok += (p.stok || 0);
    }
    var totalLaba = totalJual - totalModal;
    var marginRata = totalJual > 0 ? ((totalLaba / totalJual) * 100).toFixed(1) : 0;
    
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    var pageWidth = doc.internal.pageSize.width;
    var pageHeight = doc.internal.pageSize.height;

    // ==================== LOGO ====================
    var logoDataUrl = null;
    var logoSources = ['src/icons/logo.png', 'https://i.imgur.com/2mDfHEi.png'];
    for (var li = 0; li < logoSources.length; li++) {
      try {
        var logoResponse = await fetch(logoSources[li], { mode: 'cors' });
        if (!logoResponse.ok) continue;
        var contentType = logoResponse.headers && logoResponse.headers.get ? logoResponse.headers.get('content-type') : null;
        if (contentType && contentType.indexOf('image') === -1) continue;
        var logoBlob = await logoResponse.blob();
        if (!logoBlob || !logoBlob.size || logoBlob.size < 200) continue;
        var reader = new FileReader();
        logoDataUrl = await new Promise(function(resolve, reject) {
          reader.onload = function() { resolve(reader.result); };
          reader.onerror = function(err) { reject(err); };
          reader.readAsDataURL(logoBlob);
        });
        if (logoDataUrl) break;
      } catch (err) {
        console.warn('Logo load failed for', logoSources[li], err);
        logoDataUrl = null;
      }
    }
    
    // Kompres logo
    if (logoDataUrl && typeof logoDataUrl === 'string' && logoDataUrl.indexOf('data:image/') === 0) {
      try {
        var imgEl = document.createElement('img');
        imgEl.src = logoDataUrl;
        await new Promise(function(resolve, reject) {
          imgEl.onload = resolve;
          imgEl.onerror = reject;
        });
        
        var maxDim = 300;
        var scale = Math.min(1, maxDim / Math.max(imgEl.naturalWidth || imgEl.width, imgEl.naturalHeight || imgEl.height));
        var cw = Math.round((imgEl.naturalWidth || imgEl.width) * scale);
        var ch = Math.round((imgEl.naturalHeight || imgEl.height) * scale);
        var canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(imgEl, 0, 0, cw, ch);
        logoDataUrl = canvas.toDataURL('image/png');
      } catch (e) {
        console.warn('Logo compression failed, using original:', e);
      }
    }

    // ==================== HEADER (HANYA HALAMAN PERTAMA) ====================
    // Header Hijau Emas
    doc.setFillColor(18, 99, 58);
    doc.rect(0, 0, pageWidth, 28, 'F');
    
    // Posisi logo
    var logoX = 12;
    var logoY = 6;
    var logoWidth = 12;
    var logoHeight = 14;
    
    if (logoDataUrl && typeof logoDataUrl === 'string' && logoDataUrl.indexOf('data:image/') === 0) {
      try {
        var isPng = logoDataUrl.indexOf('image/png') !== -1;
        var imgFormat = isPng ? 'PNG' : 'JPEG';
        doc.addImage(logoDataUrl, imgFormat, logoX, logoY, logoWidth, logoHeight, undefined, 'NONE');
      } catch (err) {
        console.warn('Skipping invalid logo image:', err);
      }
    }
    
    var textStartX = logoDataUrl ? (logoX + logoWidth + 6) : 14;
    
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 238, 160);
    doc.text('LAPORAN MASTER DATA PRODUK', textStartX, 11);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 170);
    doc.text('Kitabuna Almuktamar', textStartX, 19);
    
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 170);
    doc.text('Dicetak: ' + new Date().toLocaleString('id-ID'), pageWidth - 14, 11, { align: 'right' });
    
    doc.setDrawColor(204, 181, 71);
    doc.setLineWidth(0.5);
    doc.line(14, 28, pageWidth - 14, 28);

    // ==================== TABEL DATA (showHead: 'firstPage') ====================
    var yPos = 38;
    var tableData = [];
    for (var j = 0; j < produk.length; j++) {
      var p = produk[j];
      var totalModalItem = (p.harga_beli || 0) * (p.stok || 0);
      var totalJualItem = (p.harga_jual || 0) * (p.stok || 0);
      var labaItem = totalJualItem - totalModalItem;
      var pdfKelasNames = [];
      if (Array.isArray(p.kelas_ids) && p.kelas_ids.length > 0) {
        for (var ki = 0; ki < p.kelas_ids.length; ki++) {
          var kid = p.kelas_ids[ki];
          if (kelasMap[kid]) pdfKelasNames.push(kelasMap[kid]);
          else pdfKelasNames.push(kid);
        }
      } else if (Array.isArray(p.kelas_names) && p.kelas_names.length > 0) {
        pdfKelasNames = p.kelas_names;
      } else if (typeof p.kelas === 'string' && p.kelas.trim()) {
        pdfKelasNames = p.kelas.split(/\s*,\s*/).filter(Boolean);
      } else if (p.kelas_id) {
        if (kelasMap[p.kelas_id]) pdfKelasNames.push(kelasMap[p.kelas_id]);
        else pdfKelasNames.push(p.kelas_id);
      }
      var namaKelas = pdfKelasNames.length > 0 ? pdfKelasNames.join(', ') : '-';
      tableData.push([
        (j + 1).toString(),
        p.nama || '-',
        namaKelas,
        'Rp ' + (p.harga_beli || 0).toLocaleString(),
        'Rp ' + (p.harga_jual || 0).toLocaleString(),
        (p.stok || 0).toString(),
        'Rp ' + totalModalItem.toLocaleString(),
        'Rp ' + totalJualItem.toLocaleString(),
        'Rp ' + labaItem.toLocaleString()
      ]);
    }
    
    // Variabel untuk menyimpan jumlah halaman total
    var totalPages = 0;
    
    doc.autoTable({
      startY: yPos,
      head: [['No', 'Nama Produk', 'Kelas', 'Modal', 'Harga Jual', 'Stok', 'Total Modal', 'Total Jual', 'Laba']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [18, 99, 58],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
        cellPadding: 3.5
      },
      bodyStyles: { fontSize: 8.5, cellPadding: 3.5, textColor: 35 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 60, halign: 'left' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 28, halign: 'right' },
        7: { cellWidth: 28, halign: 'right' },
        8: { cellWidth: 28, halign: 'right' }
      },
      alternateRowStyles: { fillColor: [240, 248, 240] },
      margin: { left: 14, right: 14 },
      showHead: 'firstPage',
      didDrawPage: function(data) {
        // Simpan jumlah halaman dari autoTable
        totalPages = data.pageCount;
        
        var currentPageHeight = doc.internal.pageSize.height;
        
        // Footer setiap halaman (tanpa nomor halaman dulu, akan diupdate setelah ringkasan)
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text('Kitabuna Almuktamar', 14, currentPageHeight - 8);
      }
    });

    // ==================== RINGKASAN (POIN-POIN FORMAT LAPORAN) ====================
    var finalY = doc.lastAutoTable.finalY + 12;
    var summaryBoxWidth = 76;
    var summaryBoxHeight = 64;
    var summaryX = pageWidth - 14 - summaryBoxWidth;
    var summaryY = finalY;
    
    if (summaryY + summaryBoxHeight > pageHeight - 15) {
      doc.addPage();
      summaryY = 20;
    }
    
    doc.setFillColor(247, 244, 229);
    doc.setDrawColor(204, 181, 71);
    doc.setLineWidth(0.5);
    doc.roundedRect(summaryX, summaryY, summaryBoxWidth, summaryBoxHeight, 4, 4, 'FD');
    
    doc.setFontSize(11);
    doc.setTextColor(18, 99, 58);
    doc.setFont('helvetica', 'bold');
    doc.text('RINGKASAN MASTER DATA', summaryX + 4, summaryY + 8, { align: 'left' });
    
    // Poin-poin ringkasan
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    
    var poinStartY = summaryY + 18;
    var lineHeight = 8;
    var colonX = summaryX + summaryBoxWidth / 2;
    var valueX = summaryX + summaryBoxWidth - 4;
    
    // Data ringkasan
    var ringkasanData = [
      { label: 'Total Produk', value: produk.length + ' item' },
      { label: 'Total Stok', value: totalStok + ' item' },
      { label: 'Total Nilai Modal', value: 'Rp ' + totalModal.toLocaleString() },
      { label: 'Total Nilai Jual', value: 'Rp ' + totalJual.toLocaleString() },
      { label: 'Potensi Laba', value: 'Rp ' + totalLaba.toLocaleString() },
      { label: 'Margin Rata-rata', value: marginRata + ' %' }
    ];
    
    for (var s = 0; s < ringkasanData.length; s++) {
      var item = ringkasanData[s];
      var yPos = poinStartY + (s * lineHeight);
      
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, summaryX + 4, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.text(':', colonX, yPos, { align: 'center' });
      doc.text(item.value, valueX, yPos, { align: 'right' });
    }
    
    // Footer profesional (rata tengah)
    var footerY = pageHeight - 10;
    doc.setFontSize(7);
    doc.setTextColor(18, 99, 58);
    doc.setFont('helvetica', 'italic');
    
    
    // ==================== UPDATE NOMOR HALAMAN UNTUK SEMUA HALAMAN ====================
    // Dapatkan jumlah halaman total setelah semua penambahan
    var finalPageCount = doc.getNumberOfPages();
    
    // Loop melalui setiap halaman dan tambahkan nomor halaman
    for (var pageNum = 1; pageNum <= finalPageCount; pageNum++) {
      doc.setPage(pageNum);
      var currentPageHeight = doc.internal.pageSize.height;
      
      // Tambah nomor halaman di kanan footer
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text('Page ' + pageNum + ' / ' + finalPageCount, pageWidth - 14, currentPageHeight - 8, { align: 'right' });
    }
    
    // Kembali ke halaman terakhir untuk output
    doc.setPage(finalPageCount);

    Swal.close();
    
    // ==================== SIMPAN / LIHAT PDF ====================
    var pdfBlob = doc.output('blob');
    var fileName = 'Master_Data_Produk_' + new Date().toISOString().split('T')[0] + '.pdf';
    
    var result = await Swal.fire({
      title: 'PDF Selesai',
      html: 'Laporan Master Data berhasil dibuat.<br><br>Pilih tindakan:',
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Simpan PDF',
      cancelButtonText: 'Lihat PDF',
      confirmButtonColor: '#27ae60',
      cancelButtonColor: '#3498db'
    });
    
    if (result.isConfirmed) {
      var link = document.createElement('a');
      var url = URL.createObjectURL(pdfBlob);
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(function() { URL.revokeObjectURL(url); }, 100);
      Swal.fire({ icon: 'success', title: 'Tersimpan!', text: 'File PDF telah disimpan', timer: 1500, showConfirmButton: false });
    } else {
      var url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    }
    
  } catch(error) {
    console.error('Error exporting PDF:', error);
    Swal.close();
    Swal.fire({ icon: 'error', title: 'Gagal Export PDF', text: error.message || 'Terjadi kesalahan saat membuat PDF' });
  }
}

// ==================== MASTER KELAS PAGE ====================
async function loadMasterKelasPage() {
  setActiveMenu('master-kelas');
  document.getElementById("pageTitle").innerHTML = '<i class="fas fa-layer-group"></i> Master Kelas';
  
  var kelasData = await window.offlineCore.getAllKelas();
  var kelasList = kelasData.data || [];
  
  // Update global kelasMap untuk digunakan di komponen lain
  window.kelasMap = {};
  for (var i = 0; i < kelasList.length; i++) {
    window.kelasMap[kelasList[i].id] = kelasList[i].nama_kelas;
  }
  
  var html = '<div class="card">' +
    '<div class="master-kelas-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
      '<h2><i class="fas fa-layer-group" "></i> Master Kelas</h2>' +
      (window.currentRole === 'admin' ? '<button class="btn btn-success" onclick="showFormKelas()"><i class="fas fa-plus"></i> Tambah Kelas</button>' : '') +
    '</div>' +
    '<div class="stats-kelas" style="display:flex;gap:20px;margin:20px 0;padding:15px;background:#f8f9fa;border-radius:12px;">' +
      '<div><strong>Total Kelas:</strong> ' + kelasList.length + '</div>' +
    '</div>' +
    '<div class="kelas-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;">';
  
  for (var i = 0; i < kelasList.length; i++) {
    var k = kelasList[i];
    html += '<div class="kelas-card" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">' +
      '<div class="kelas-card-header" style="background:' + getOfflineKelasGradient(i) + ';color:white;padding:20px;text-align:center;">' +
        '<h3 style="margin:0;"><i class="fas fa-graduation-cap"></i> ' + escapeHtml(k.nama_kelas) + '</h3>' +
      '</div>' +
      '<div class="kelas-card-body" style="padding:20px;">' +
        '<p>' + (escapeHtml(k.deskripsi) || 'Tidak ada deskripsi') + '</p>' +
        (window.currentRole === 'admin' ? '<div class="kelas-actions" style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">' +
          '<button class="btn btn-primary btn-sm" onclick="editKelas(\'' + k.id + '\')"><i class="fas fa-edit"></i> Edit</button>' +
          '<button class="btn btn-danger btn-sm" onclick="hapusKelas(\'' + k.id + '\')"><i class="fas fa-trash"></i> Hapus</button>' +
        '</div>' : '') +
      '</div>' +
    '</div>';
  }
  
  if (kelasList.length === 0) {
    html += '<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:50px;"><i class="fas fa-layer-group" style="font-size:4rem;color:#95a5a6"></i><h3>Belum Ada Kelas</h3><p>' + (window.currentRole === 'admin' ? 'Klik "Tambah Kelas" untuk membuat kelas baru' : 'Belum ada data kelas tersedia') + '</p></div>';
  }
  
  html += '</div></div>';
  
  document.getElementById("content").innerHTML = html;
}

// ==================== FORM KELAS ====================
function showFormKelas(kelas) {
  var isEdit = kelas ? true : false;
  var nama_kelas = kelas ? kelas.nama_kelas : "";
  var deskripsi = kelas ? (kelas.deskripsi || "") : "";
  
  Swal.fire({
    title: isEdit ? 'Edit Kelas' : 'Tambah Kelas Baru',
    html: '<div style="text-align:left">' +
      '<div class="form-group"><label>Nama Kelas <span style="color:red">*</span></label>' +
      '<input type="text" id="nama_kelas" class="swal2-input" style="width:100%" placeholder="Contoh: Kelas 1, Paket A" value="' + escapeHtml(nama_kelas) + '"></div>' +
      '<div class="form-group" style="margin-top:15px"><label>Deskripsi (Opsional)</label>' +
      '<textarea id="deskripsi" class="swal2-textarea" style="width:100%;height:80px" placeholder="Deskripsi kelas...">' + escapeHtml(deskripsi) + '</textarea></div>' +
    '</div>',
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
      
      var data = { nama_kelas: result.value.nama_kelas, deskripsi: result.value.deskripsi };
      var saveResult = await window.offlineCore.saveKelas(data, isEdit ? kelas.id : null);
      
      Swal.close();
      if (saveResult.success) {
        Swal.fire({ icon: 'success', title: 'Berhasil', text: isEdit ? 'Kelas diperbarui' : 'Kelas ditambahkan', timer: 1500 });
        // Refresh kelas map dan reload page
        await refreshKelasData();
        loadMasterKelasPage();
      } else {
        Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan kelas' });
      }
    }
  });
}

async function editKelas(id) {
  var result = await window.offlineCore.getKelasById(id);
  if (result.data) showFormKelas(result.data);
  else Swal.fire({ icon: 'error', title: 'Gagal', text: 'Kelas tidak ditemukan' });
}

async function hapusKelas(id) {
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
      await refreshKelasData();
      loadMasterKelasPage();
    } else {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menghapus kelas' });
    }
  }
}

// ==================== REFRESH KELAS DATA ====================
async function refreshKelasData() {
  var kelasData = await window.offlineCore.getAllKelas();
  var kelasList = kelasData.data || [];
  console.log('📚 refreshKelasData: Retrieved', kelasList.length, 'kelas');
  
  window.kelasMap = {};
  for (var i = 0; i < kelasList.length; i++) {
    window.kelasMap[kelasList[i].id] = kelasList[i].nama_kelas;
    console.log('  ➕ Added to kelasMap:', kelasList[i].id, '→', kelasList[i].nama_kelas);
  }
  console.log('✅ kelasMap populated with', Object.keys(window.kelasMap).length, 'entries');
  console.log('🗺️ kelasMap content:', window.kelasMap);
}

// ==================== UTILITY ====================
function setActiveMenu(menu) {
  var menus = ['dashboard', 'produk', 'kasir', 'laporan', 'laporan-master', 'master-kelas'];
  for (var i = 0; i < menus.length; i++) {
    var el = document.getElementById('menu-' + menus[i]);
    if (el) {
      if (menus[i] === menu) el.classList.add('active');
      else el.classList.remove('active');
    }
  }
}

// ==================== LOGOUT ====================
async function logout() {
  await sb.auth.signOut();
  localStorage.removeItem("offline_allowed");
  localStorage.removeItem("offline_user_id");
  localStorage.removeItem("offline_user_name");
  localStorage.removeItem("offline_user_role");
  window.location.href = "index.html";
}