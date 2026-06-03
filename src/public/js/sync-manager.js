// js/sync-manager.js - COMPARE DATA OFFLINE VS ONLINE

class SyncManager {
  constructor() {
    this.isSyncing = false;
  }

  // ==================== COMPARE DATA ====================
  async compareData() {
    if (!navigator.onLine) {
      Swal.fire({
        icon: 'warning',
        title: 'Offline',
        text: 'Sambungkan internet untuk membandingkan data',
        confirmButtonText: 'Tutup'
      });
      return null;
    }

    if (!window.auth || !window.auth.canUseOfflineMode()) {
      Swal.fire({
        icon: 'warning',
        title: 'Perangkat Tidak Diizinkan',
        text: 'Fitur perbandingan dan sinkronisasi offline hanya tersedia untuk perangkat desktop/laptop yang disetujui.',
        confirmButtonText: 'Tutup'
      });
      return null;
    }
    
    Swal.fire({
      title: 'Membandingkan Data...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });
    
    try {
      // Ambil data offline
      const offlineProduk = await window.localDB.getAll('produk') || [];
      const offlineKelas = await window.localDB.getAll('master_kelas') || [];
      const offlineTransaksi = await window.localDB.getAll('transaksi') || [];
      
      // Ambil data online dari Supabase (gunakan view yang mengembalikan kelas_ids) with fallback
      const { data: onlineProduk } = await this.fetchProdukWithKelas('id, nama, updated_at');
      const { data: onlineKelas } = await sb.from('master_kelas').select('id, nama_kelas, updated_at');
      const { data: onlineTransaksi } = await sb.from('transaksi').select('id, total, created_at').limit(100);
      
      Swal.close();
      
      // Analisis perbedaan
      const comparison = {
        produk: {
          offline: offlineProduk.length,
          online: onlineProduk?.length || 0,
          onlyOffline: [],
          onlyOnline: [],
          different: []
        },
        kelas: {
          offline: offlineKelas.length,
          online: onlineKelas?.length || 0,
          onlyOffline: [],
          onlyOnline: [],
          different: []
        },
        transaksi: {
          offline: offlineTransaksi.length,
          online: onlineTransaksi?.length || 0,
          onlyOffline: [],
          onlyOnline: []
        }
      };
      
      // Bandingkan produk
      const offlineProdukMap = new Map(offlineProduk.map(p => [p.id, p]));
      const onlineProdukMap = new Map(onlineProduk?.map(p => [p.id, p]) || []);
      
      for (const [id, p] of offlineProdukMap) {
        if (!onlineProdukMap.has(id)) {
          comparison.produk.onlyOffline.push({ id, nama: p.nama });
        } else {
          const online = onlineProdukMap.get(id);
          if (p.updated_at !== online.updated_at) {
            comparison.produk.different.push({ id, nama: p.nama, offline: p.updated_at, online: online.updated_at });
          }
        }
      }
      
      for (const [id, p] of onlineProdukMap) {
        if (!offlineProdukMap.has(id)) {
          comparison.produk.onlyOnline.push({ id, nama: p.nama });
        }
      }
      
      // Bandingkan kelas
      const offlineKelasMap = new Map(offlineKelas.map(k => [k.id, k]));
      const onlineKelasMap = new Map(onlineKelas?.map(k => [k.id, k]) || []);
      
      for (const [id, k] of offlineKelasMap) {
        if (!onlineKelasMap.has(id)) {
          comparison.kelas.onlyOffline.push({ id, nama: k.nama_kelas });
        } else {
          const online = onlineKelasMap.get(id);
          if (k.updated_at !== online.updated_at) {
            comparison.kelas.different.push({ id, nama: k.nama_kelas, offline: k.updated_at, online: online.updated_at });
          }
        }
      }
      
      for (const [id, k] of onlineKelasMap) {
        if (!offlineKelasMap.has(id)) {
          comparison.kelas.onlyOnline.push({ id, nama: k.nama_kelas });
        }
      }
      
      // Tampilkan hasil
      this.showComparisonResult(comparison);
      
      return comparison;
      
    } catch (error) {
      Swal.close();
      console.error('Compare error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Membandingkan',
        text: error.message,
        confirmButtonText: 'Tutup'
      });
      return null;
    }
  }
  
  // ==================== TAMPILKAN HASIL COMPARE ====================
  showComparisonResult(comparison) {
    const hasDiff = comparison.produk.onlyOffline.length > 0 ||
                    comparison.produk.onlyOnline.length > 0 ||
                    comparison.produk.different.length > 0 ||
                    comparison.kelas.onlyOffline.length > 0 ||
                    comparison.kelas.onlyOnline.length > 0 ||
                    comparison.kelas.different.length > 0;
    
    let html = `
      <div style="max-height: 500px; overflow-y: auto;">
        <div class="comparison-summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
          <div style="background: #f8f9fa; padding: 15px; border-radius: 12px; text-align: center;">
            <h4>📦 Produk</h4>
            <p>Offline: <strong>${comparison.produk.offline}</strong> | Online: <strong>${comparison.produk.online}</strong></p>
          </div>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 12px; text-align: center;">
            <h4>📚 Kelas</h4>
            <p>Offline: <strong>${comparison.kelas.offline}</strong> | Online: <strong>${comparison.kelas.online}</strong></p>
          </div>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 12px; text-align: center;">
            <h4>🧾 Transaksi</h4>
            <p>Offline: <strong>${comparison.transaksi.offline}</strong> | Online: <strong>${comparison.transaksi.online}</strong></p>
          </div>
        </div>
    `;
    
    // Produk
    if (comparison.produk.onlyOffline.length > 0 || comparison.produk.onlyOnline.length > 0 || comparison.produk.different.length > 0) {
      html += `<div style="margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: #3498db; color: white; padding: 12px; font-weight: 600;">
          <i class="fas fa-box"></i> Produk
        </div>
        <div style="padding: 15px;">`;
      
      if (comparison.produk.onlyOnline.length > 0) {
        html += `<p style="color: #27ae60; margin-bottom: 8px;"><i class="fas fa-cloud-download-alt"></i> <strong>Di Server (belum di lokal):</strong> ${comparison.produk.onlyOnline.length} item</p>
                 <ul style="margin-bottom: 15px; padding-left: 20px;">`;
        for (const p of comparison.produk.onlyOnline.slice(0, 10)) {
          html += `<li>${p.nama}</li>`;
        }
        if (comparison.produk.onlyOnline.length > 10) {
          html += `<li><em>...dan ${comparison.produk.onlyOnline.length - 10} lainnya</em></li>`;
        }
        html += `</ul>`;
      }
      
      if (comparison.produk.onlyOffline.length > 0) {
        html += `<p style="color: #e74c3c; margin-bottom: 8px;"><i class="fas fa-database"></i> <strong>Hanya di Lokal (belum di server):</strong> ${comparison.produk.onlyOffline.length} item</p>
                 <ul style="margin-bottom: 15px; padding-left: 20px;">`;
        for (const p of comparison.produk.onlyOffline.slice(0, 10)) {
          html += `<li>${p.nama}</li>`;
        }
        if (comparison.produk.onlyOffline.length > 10) {
          html += `<li><em>...dan ${comparison.produk.onlyOffline.length - 10} lainnya</em></li>`;
        }
        html += `</ul>`;
      }
      
      if (comparison.produk.different.length > 0) {
        html += `<p style="color: #f39c12; margin-bottom: 8px;"><i class="fas fa-sync-alt"></i> <strong>Perbedaan Update:</strong> ${comparison.produk.different.length} item</p>`;
      }
      
      html += `</div></div>`;
    }
    
    // Kelas
    if (comparison.kelas.onlyOffline.length > 0 || comparison.kelas.onlyOnline.length > 0 || comparison.kelas.different.length > 0) {
      html += `<div style="margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden;">
        <div style="background: #e67e22; color: white; padding: 12px; font-weight: 600;">
          <i class="fas fa-layer-group"></i> Kelas
        </div>
        <div style="padding: 15px;">`;
      
      if (comparison.kelas.onlyOnline.length > 0) {
        html += `<p style="color: #27ae60;"><i class="fas fa-cloud-download-alt"></i> <strong>Di Server (belum di lokal):</strong> ${comparison.kelas.onlyOnline.length} item</p>
                 <ul style="margin-bottom: 15px; padding-left: 20px;">`;
        for (const k of comparison.kelas.onlyOnline) {
          html += `<li>${k.nama}</li>`;
        }
        html += `</ul>`;
      }
      
      if (comparison.kelas.onlyOffline.length > 0) {
        html += `<p style="color: #e74c3c;"><i class="fas fa-database"></i> <strong>Hanya di Lokal (belum di server):</strong> ${comparison.kelas.onlyOffline.length} item</p>
                 <ul style="margin-bottom: 15px; padding-left: 20px;">`;
        for (const k of comparison.kelas.onlyOffline) {
          html += `<li>${k.nama}</li>`;
        }
        html += `</ul>`;
      }
      
      html += `</div></div>`;
    }
    
    html += `
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button class="btn btn-primary" id="syncMissingBtn" style="flex: 1;">
            <i class="fas fa-cloud-download-alt"></i> Sinkronkan Data Kurang
          </button>
          <button class="btn btn-success" id="syncAllBtn" style="flex: 1;">
            <i class="fas fa-sync-alt"></i> Sinkronkan Semua
          </button>
        </div>
      </div>
    `;
    
    Swal.fire({
      title: 'Perbandingan Data',
      html: html,
      width: '600px',
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Tutup',
      didOpen: () => {
        document.getElementById('syncMissingBtn')?.addEventListener('click', () => {
          Swal.close();
          this.syncMissingData(comparison);
        });
        document.getElementById('syncAllBtn')?.addEventListener('click', () => {
          Swal.close();
          this.syncAllData();
        });
      }
    });
  }
  
  // ==================== SYNC DATA YANG KURANG ====================
  async syncMissingData(comparison) {
    Swal.fire({
      title: 'Menyinkronkan Data...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });
    
    try {
      // Sync produk yang hanya di online
      if (comparison.produk.onlyOnline.length > 0) {
        const ids = comparison.produk.onlyOnline.map(p => p.id);
        const { data: produkList } = await this.fetchProdukWithKelas('*', ids);
        if (produkList) {
          for (const p of produkList) {
            await window.localDB.save('produk', p, p.id);
          }
        }
      }
      
      // Sync kelas yang hanya di online
      if (comparison.kelas.onlyOnline.length > 0) {
        const ids = comparison.kelas.onlyOnline.map(k => k.id);
        const { data: kelasList } = await sb.from('master_kelas').select('*').in('id', ids);
        if (kelasList) {
          for (const k of kelasList) {
            await window.localDB.save('master_kelas', k, k.id);
          }
        }
      }
      
      // Upload produk yang hanya di offline
      if (comparison.produk.onlyOffline.length > 0) {
      var PRODUK_COLUMNS = ['id', 'nama', 'harga_beli', 'harga_jual', 'stok', 'gambar_url', 'created_at', 'updated_at', 'deleted_at', 'synced_at'];
        for (const p of comparison.produk.onlyOffline) {
          const produk = await window.localDB.getById('produk', p.id);
          if (produk && String(produk.id).indexOf('local_') === 0) {
            // Strip non-existent columns before insert
            var cleanProduk = {};
            PRODUK_COLUMNS.forEach(function(col) { if (produk[col] !== undefined) cleanProduk[col] = produk[col]; });
            delete cleanProduk.id; // let Supabase generate UUID
            const { data: inserted, error } = await sb.from('produk').insert(cleanProduk).select().single();
            if (!error && inserted) {
              // Preserve kelas_ids for sync
              var syncData = Object.assign({}, inserted, { kelas_ids: produk.kelas_ids });
              await window.localDB.save('produk', Object.assign({}, produk, inserted, { id: inserted.id }), inserted.id);
              await window.localDB.moveImageRecord(p.id, inserted.id);
              await window.localDB.delete('produk', p.id);
              // sync kelas association for newly inserted produk
              await this.syncProdukKelasToServer(syncData);
            }
          } else if (produk) {
            // Strip non-existent columns before upsert
            var cleanProduk = {};
            PRODUK_COLUMNS.forEach(function(col) { if (produk[col] !== undefined) cleanProduk[col] = produk[col]; });
            const { error } = await sb.from('produk').upsert(cleanProduk, { onConflict: 'id' });
            if (!error) {
              // ensure produk_kelas matches local
              await this.syncProdukKelasToServer(produk);
            }
          }
        }
      }
      
      // Upload kelas yang hanya di offline
      if (comparison.kelas.onlyOffline.length > 0) {
        for (const k of comparison.kelas.onlyOffline) {
          const kelas = await window.localDB.getById('master_kelas', k.id);
          if (kelas && String(kelas.id).indexOf('kelas_') === 0) {
            const { data: inserted, error } = await sb.from('master_kelas').insert(kelas).select().single();
            if (!error && inserted) {
              await window.localDB.save('master_kelas', inserted, inserted.id);
              await window.localDB.delete('master_kelas', k.id);
            }
          } else if (kelas) {
            await sb.from('master_kelas').upsert(kelas, { onConflict: 'id' });
          }
        }
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Selesai!',
        text: 'Data yang kurang telah disinkronkan',
        timer: 2000,
        showConfirmButton: false
      });
      
      setTimeout(() => location.reload(), 1500);
      
    } catch (error) {
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Gagal Sinkronisasi',
        text: error.message,
        confirmButtonText: 'Tutup'
      });
    }
  }
  
  // ==================== SYNC ALL DATA ====================
  async syncAllData() {
    if (!navigator.onLine) {
      Swal.fire({
        icon: 'warning',
        title: 'Offline',
        text: 'Sambungkan internet untuk sinkronisasi',
        confirmButtonText: 'Tutup'
      });
      return;
    }

    if (!window.auth || !window.auth.canUseOfflineMode()) {
      Swal.fire({
        icon: 'warning',
        title: 'Perangkat Tidak Diizinkan',
        text: 'Fitur sinkronisasi offline hanya tersedia untuk perangkat desktop/laptop yang disetujui.',
        confirmButtonText: 'Tutup'
      });
      return;
    }
    
    Swal.fire({
      title: 'Sinkronisasi Total...',
      text: 'Mengunduh semua data terbaru',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });
    
    try {
      // Sync kelas
      await window.offlineCore.syncKelasFromSupabase();
      
      // Sync produk (try view first, fallback to produk)
      const { data: allProduk } = await this.fetchProdukWithKelas('*');
      if (allProduk) {
        for (const p of allProduk) {
          await window.localDB.save('produk', p, p.id);
        }
      }
      
      // Upload produk lokal yang belum tersinkron
      var PRODUK_COLUMNS2 = ['id', 'nama', 'harga_beli', 'harga_jual', 'stok', 'gambar_url', 'created_at', 'updated_at', 'deleted_at', 'synced_at'];
      const offlineProduk = await window.localDB.getAll('produk') || [];
      for (const p of offlineProduk) {
        if (String(p.id).indexOf('local_') === 0) {
          var cleanP = {};
          PRODUK_COLUMNS2.forEach(function(col) { if (p[col] !== undefined) cleanP[col] = p[col]; });
          delete cleanP.id;
          const { data: inserted } = await sb.from('produk').insert(cleanP).select().single();
          if (inserted) {
            var syncData = Object.assign({}, inserted, { kelas_ids: p.kelas_ids });
            await window.localDB.save('produk', Object.assign({}, p, inserted, { id: inserted.id }), inserted.id);
            await window.localDB.moveImageRecord(p.id, inserted.id);
            await window.localDB.delete('produk', p.id);
            await this.syncProdukKelasToServer(syncData);
          }
        }
      }
      
      const now = new Date().toISOString();
      localStorage.setItem('last_full_sync', now);
      localStorage.setItem('last_sync_produk', now);
      localStorage.setItem('last_sync_kelas', now);
      localStorage.setItem('last_sync_transaksi', now);
      
      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi Selesai!',
        text: 'Semua data telah disinkronkan',
        timer: 2000,
        showConfirmButton: false
      });
      
      setTimeout(() => location.reload(), 1500);
      
    } catch (error) {
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Gagal Sinkronisasi',
        text: error.message,
        confirmButtonText: 'Tutup'
      });
    }
  }

  // ==================== SYNC PRODUK_KELAS JOIN TABLE ====================
  async syncProdukKelasToServer(produk) {
    if (!navigator.onLine) return;
    try {
      const produkId = produk.id;
      const kelasIds = Array.isArray(produk.kelas_ids) ? produk.kelas_ids : (produk.kelas_id ? [produk.kelas_id] : []);

      // Remove existing associations on server for this produk
      const delRes = await sb.from('produk_kelas').delete().eq('produk_id', produkId);
      if (delRes.error) {
        console.warn('produk_kelas delete warning:', delRes.error);
      }

      if (!kelasIds || kelasIds.length === 0) return;

      const rows = kelasIds.map(kid => ({ produk_id: produkId, kelas_id: kid }));
      const insRes = await sb.from('produk_kelas').insert(rows);
      if (insRes.error) {
        console.error('Failed to insert produk_kelas rows', insRes.error);
      } else {
        console.log('Synced produk_kelas for produk', produkId);
      }
    } catch (err) {
      console.error('syncProdukKelasToServer error:', err);
    }
  }

  // Try to fetch produk via view v_produk_with_kelas, fallback to produk table
  async fetchProdukWithKelas(select = '*', ids = null) {
    try {
      // First try to get products with their kelas from the view
      console.log('🔍 fetchProdukWithKelas: Trying view v_produk_with_kelas...');
      let query = sb.from('v_produk_with_kelas').select(select);
      if (ids && Array.isArray(ids) && ids.length > 0) query = query.in('id', ids);
      const res = await query;
      
      if (res.error) throw res.error;
      if (res.data && res.data.length > 0) {
        console.log('✅ View v_produk_with_kelas succeeded, produk count:', res.data.length);
        let data = (res.data || []).map(p => {
          const kelasIds = Array.isArray(p.kelas_ids)
            ? p.kelas_ids
            : (p.kelas_id ? [p.kelas_id] : []);
          const kelasNames = typeof p.kelas === 'string' && p.kelas.trim()
            ? p.kelas.split(/\s*,\s*/).filter(Boolean)
            : [];
          return {
            ...p,
            kelas_ids: kelasIds,
            kelas_names: kelasNames
          };
        });

        // If view returns names but no IDs, supplement with produk_kelas lookup.
        const idsToFetch = data.map(p => p.id).filter(Boolean);
        if (idsToFetch.length > 0) {
          const { data: produkKelasData, error: pkError } = await sb
            .from('produk_kelas')
            .select('produk_id, kelas_id')
            .in('produk_id', idsToFetch);
          if (pkError) {
            console.warn('⚠️ Error fetching produk_kelas ids:', pkError.message || pkError);
          } else if (produkKelasData && produkKelasData.length > 0) {
            const kelasMap = {};
            for (const pk of produkKelasData) {
              if (!kelasMap[pk.produk_id]) kelasMap[pk.produk_id] = [];
              kelasMap[pk.produk_id].push(pk.kelas_id);
            }
            data = data.map(p => ({
              ...p,
              kelas_ids: kelasMap[p.id] || p.kelas_ids || []
            }));
            console.log('🗺️ Added kelas_ids from produk_kelas for view results');
          }
        }

        console.log('📦 Sample produk with kelas:', data[0]);
        return { data };
      }
      console.log('⚠️ View v_produk_with_kelas returned empty result');
    } catch (err) {
      console.warn('⚠️ v_produk_with_kelas fetch failed, falling back to produk with manual kelas lookup:', err.message || err);
    }

    // Fallback: Fetch produk table directly and then get kelas associations separately
    try {
      console.log('🔄 Fallback: Fetching from produk table directly...');
      let query2 = sb.from('produk').select(select);
      if (ids && Array.isArray(ids) && ids.length > 0) query2 = query2.in('id', ids);
      const res2 = await query2;
      
      if (res2.error) throw res2.error;
      
      let produkList = res2.data || [];
      console.log('📦 Produk fetched:', produkList.length);
      
      // For each produk, fetch its associated kelas from produk_kelas table
      if (produkList.length > 0) {
        const produkIds = produkList.map(p => p.id);
        console.log('🔍 Fetching produk_kelas for', produkIds.length, 'produk...');
        
        const { data: produkKelasData, error: pkError } = await sb
          .from('produk_kelas')
          .select('produk_id, kelas_id')
          .in('produk_id', produkIds);
        
        if (pkError) {
          console.warn('⚠️ Error fetching produk_kelas:', pkError.message);
        }
        
        console.log('📊 produk_kelas records found:', produkKelasData ? produkKelasData.length : 0);
        if (produkKelasData && produkKelasData.length > 0) {
          console.log('📋 Sample produk_kelas data:', produkKelasData.slice(0, 3));
          
          // Create a map of produk_id -> [kelas_ids]
          const kelasMap = {};
          for (const pk of produkKelasData) {
            if (!kelasMap[pk.produk_id]) {
              kelasMap[pk.produk_id] = [];
            }
            kelasMap[pk.produk_id].push(pk.kelas_id);
          }
          
          console.log('🗺️ Kelas map created, unique produk with kelas:', Object.keys(kelasMap).length);
          
          // Attach kelas_ids to each produk
          produkList = produkList.map(p => ({
            ...p,
            kelas_ids: kelasMap[p.id] || []
          }));
          
          console.log('✅ Kelas attached to produk. Sample:', produkList[0]);
        } else {
          // No kelas associations found, add empty arrays
          console.log('⚠️ No produk_kelas associations found, adding empty arrays');
          produkList = produkList.map(p => ({
            ...p,
            kelas_ids: []
          }));
        }
      }
      
      console.log('✅ fetchProdukWithKelas returning', produkList.length, 'produk');
      return { data: produkList };
    } catch (err2) {
      console.error('❌ Fallback produk fetch failed:', err2.message || err2);
      return { data: [], error: err2 };
    }
  }
}

// Inisialisasi
window.syncManager = new SyncManager();
console.log('🔄 Sync Manager loaded');