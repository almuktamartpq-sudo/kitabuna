// js/offline-core.js
// Core offline functionality - ALL IN ONE

class OfflineCore {
  constructor() {
    this.ready = false;
  }
  
  async init() {
    await window.localDB.initDB();
    this.ready = true;

    // Repair kelas di background (non-blocking)
    if (navigator.onLine) {
      this.repairProdukKelas().catch(function(e) {});
    }
  }

  async repairProdukKelas() {
    try {
      const produkRecords = await window.localDB.getAll('produk') || [];
      if (!produkRecords.length) return;

      // Cek apakah ada produk yang perlu repair:
      // - kelas_ids bukan array
      // - kelas_ids kosong tanpa fallback
      // - kelas_ids masih pakai ID lokal (kelas_xxx)
      const needRepair = produkRecords.some(p => {
        if (!Array.isArray(p.kelas_ids)) return true;
        if (p.kelas_ids.length === 0 && !p.kelas && !(Array.isArray(p.kelas_names) && p.kelas_names.length > 0)) return true;
        // Cek apakah masih pakai ID lokal
        if (Array.isArray(p.kelas_ids) && p.kelas_ids.some(id => String(id).indexOf('kelas_') === 0)) return true;
        return false;
      });

      if (!needRepair) return;

      const { data: freshProduk } = await window.syncManager.fetchProdukWithKelas('*');
      if (!freshProduk || !freshProduk.length) return;

      let repairedCount = 0;
      const repairLog = [];
      
      for (const fresh of freshProduk) {
        const existing = await window.localDB.getById('produk', fresh.id);
        if (existing) {
          // Gunakan kelas_ids dari server (UUID), jangan pakai yang lokal
          const serverKelasIds = Array.isArray(fresh.kelas_ids) && fresh.kelas_ids.length > 0
            ? fresh.kelas_ids
            : (fresh.kelas_id ? [fresh.kelas_id] : []);
          
          // Catat perubahan kelas_ids
          const oldKelasIds = Array.isArray(existing.kelas_ids) ? [...existing.kelas_ids] : [];
          const hasLocalIds = oldKelasIds.some(id => String(id).indexOf('kelas_') === 0);
          
          const merged = {
            ...existing,
            ...fresh,
            kelas_ids: serverKelasIds
          };
          await window.localDB.save('produk', merged, merged.id);
          
          if (hasLocalIds) {
            repairLog.push({
              produkId: existing.id,
              produkNama: existing.nama || '(unknown)',
              oldKelasIds: oldKelasIds,
              newKelasIds: serverKelasIds
            });
          }
        } else {
          await window.localDB.save('produk', fresh, fresh.id);
        }
        repairedCount++;
      }

      if (repairedCount > 0) {
        console.log('[REPAIR] Kelas produk diperbarui:', repairedCount);
        if (repairLog.length > 0) {
          console.log('[REPAIR] Detail remap kelas_ids:');
          repairLog.forEach((log, i) => {
            console.log(`  ${i + 1}. Produk "${log.produkNama}" (${log.produkId.substring(0, 8)}...)`);
            console.log(`     OLD: ${JSON.stringify(log.oldKelasIds)}`);
            console.log(`     NEW: ${JSON.stringify(log.newKelasIds)}`);
          });
        }
      }
    } catch (error) {
      console.error('[REPAIR] Kelas produk gagal:', error.message);
    }
  }

  // ==================== HELPER: CEK APAKAH PERANGKAT ONLINE MURNI ====================
  _isOnlineOnly() {
    // Perangkat yang TIDAK boleh offline → harus ambil data langsung dari Supabase
    return navigator.onLine && typeof window.auth !== 'undefined' && !window.auth.canUseOfflineMode();
  }

  // ==================== PRODUK ====================
  async getProduk(keyword = '') {
  try {
    // ===== PRIORITAS: Supabase dulu jika online =====
    if (navigator.onLine) {
      try {
        return await this._getProdukOnline(keyword);
      } catch (onlineErr) {
        console.warn('[PRODUK] Supabase gagal, fallback IndexedDB:', onlineErr.message);
      }
    }

    // ===== FALLBACK: IndexedDB =====
    let produk = await window.localDB.getAll('produk') || [];
    
    if (keyword) {
      produk = produk.filter(function(p) {
        return p.nama && p.nama.toLowerCase().includes(keyword.toLowerCase());
      });
    }
    produk.sort(function(a, b) {
      return (a.nama || '').localeCompare(b.nama || '');
    });
    
    if (typeof window.refreshKelasData === 'function') await window.refreshKelasData();
    produk = this._enrichKelasNames(produk);
    
    // Jika cache kosong dan online, download dari server
    if (produk.length === 0 && navigator.onLine) {
      const response = await window.syncManager.fetchProdukWithKelas('*');
      const data = response.data;
      if (data && data.length) {
        for (var i = 0; i < data.length; i++) {
          await window.localDB.save('produk', data[i], data[i].id);
        }
        produk = data;
        console.log('[READ][ONLINE] Produk diunduh dari server:', data.length);
      }
    }
    
    return { data: produk, error: null };
  } catch (error) {
    console.error('[READ] Produk gagal:', error.message);
    return { data: [], error: error };
  }
}

  // ==================== PRODUK ONLINE (tanpa IndexedDB) ====================
  async _getProdukOnline(keyword = '') {
    try {
      const { data: produk } = await window.syncManager.fetchProdukWithKelas('*');
      let list = produk || [];
      list = this._enrichKelasNames(list);

      if (keyword) {
        list = list.filter(function(p) {
          return p.nama && p.nama.toLowerCase().includes(keyword.toLowerCase());
        });
      }
      list.sort(function(a, b) { return (a.nama || '').localeCompare(b.nama || ''); });

      return { data: list, error: null };
    } catch (error) {
      console.error('[READ][ONLINE] Produk gagal:', error.message);
      return { data: [], error: error };
    }
  }

  // ==================== ENRICH KELAS NAMES (shared helper) ====================
  _enrichKelasNames(produkList) {
    return produkList.map(function(p) {
      var kelasNames = [];
      // 1. Resolve kelas_ids ke nama kelas via kelasMap
      if (Array.isArray(p.kelas_ids) && p.kelas_ids.length > 0 && window.kelasMap) {
        for (var ki = 0; ki < p.kelas_ids.length; ki++) {
          var kid = p.kelas_ids[ki];
          if (window.kelasMap[kid]) kelasNames.push(window.kelasMap[kid]);
        }
      }
      // 2. Jika kelas_ids kosong tapi ada kelas_names, gunakan langsung
      if (kelasNames.length === 0 && Array.isArray(p.kelas_names) && p.kelas_names.length > 0) {
        kelasNames = p.kelas_names.slice();
      }
      // 3. Jika masih kosong tapi ada kelas string (dari view), parse
      if (kelasNames.length === 0 && typeof p.kelas === 'string' && p.kelas.trim()) {
        kelasNames = p.kelas.split(/\s*,\s*/).filter(Boolean);
      }
      // Set hasil enrichment
      if (kelasNames.length > 0) {
        if (!p.kelas_names || !p.kelas_names.length) p.kelas_names = kelasNames;
        if (!p.kelas || !p.kelas.trim()) p.kelas = kelasNames.join(', ');
      }
      return p;
    });
  }
  
  async getProdukById(id) {
    try {
      // ===== PRIORITAS: Supabase dulu jika online =====
      if (navigator.onLine) {
        try {
          const { data: produk, error } = await sb.from('v_produk_with_kelas').select('*').eq('id', id).maybeSingle();
          if (error) throw error;
          const enriched = produk ? this._enrichKelasNames([produk]) : [null];
          return { data: enriched[0], error: null };
        } catch (onlineErr) {
          console.warn('[PRODUK] Supabase getProdukById gagal, fallback IndexedDB:', onlineErr.message);
        }
      }
      // ===== FALLBACK: IndexedDB =====
      var produk = await window.localDB.getById('produk', id);
      return { data: produk, error: null };
    } catch (error) {
      return { data: null, error: error };
    }
  }
  
  async saveProduk(data, id) {
  try {
    var isOfflineDevice = !this._isOnlineOnly();
    var gambarBase64 = data.gambar_base64 || null;
    delete data.gambar_base64;

    var PRODUK_COLUMNS = ['id', 'nama', 'harga_beli', 'harga_jual', 'stok', 'gambar_url', 'created_at', 'updated_at', 'deleted_at', 'synced_at'];
    var supabaseData = {};
    PRODUK_COLUMNS.forEach(function(col) { if (data[col] !== undefined) supabaseData[col] = data[col]; });

    var saveId = null;
    var isUpdate = !!id;

    if (navigator.onLine) {
      // ===== ONLINE =====
      if (isUpdate) {
        const { error: updateError } = await sb.from('produk').update(supabaseData).eq('id', id);
        if (updateError) throw updateError;
        saveId = id;
        data.id = id; // Ensure id is set for syncProdukKelasToServer
        if (Array.isArray(data.kelas_ids)) await window.syncManager.syncProdukKelasToServer(data);
        if (isOfflineDevice) await window.localDB.save('produk', data, saveId);
        console.log('[UPDATE][ONLINE] Produk:', data.nama || data.id, '| DB+Supabase');
      } else {
        delete supabaseData.id;
        const { data: inserted, error } = await sb.from('produk').insert(supabaseData).select().single();
        if (error) throw error;
        if (!inserted) throw new Error('Insert returned no data');
        saveId = inserted.id;
        if (Array.isArray(data.kelas_ids)) { data.id = saveId; await window.syncManager.syncProdukKelasToServer(data); }
        if (isOfflineDevice) {
          var mergedData = Object.assign({}, inserted, data, { id: saveId });
          if (Array.isArray(data.kelas_ids)) mergedData.kelas_ids = data.kelas_ids;
          if (Array.isArray(data.kelas_names) && data.kelas_names.length) mergedData.kelas_names = data.kelas_names;
          if (typeof data.kelas === 'string' && data.kelas.trim()) mergedData.kelas = data.kelas;
          await window.localDB.save('produk', mergedData, saveId);
          if (gambarBase64) await window.localDB.saveImageLocally(saveId, gambarBase64);
        }
        console.log('[INSERT][ONLINE] Produk:', data.nama, '| UUID:', saveId, '| DB+Supabase');
      }
    } else {
      // ===== OFFLINE =====
      if (isOfflineDevice) {
        saveId = id || data.id || 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        await window.localDB.save('produk', data, saveId);
        if (gambarBase64) await window.localDB.saveImageLocally(saveId, gambarBase64);
        await window.localDB.addToSyncQueue('produk', isUpdate ? 'update' : 'insert', data, saveId);
        console.log(isUpdate ? '[UPDATE][OFFLINE]' : '[INSERT][OFFLINE]', 'Produk:', data.nama || data.id, '| Antrian sync');
      }
    }
    
    return { success: true, id: saveId };
  } catch (error) {
    console.error('[PRODUK] Gagal simpan:', error.message);
    return { success: false, error: error };
  }
}
  
  async deleteProduk(id) {
    try {
      var isOfflineDevice = !this._isOnlineOnly();
      if (isOfflineDevice) { try { await window.localDB.delete('produk', id); } catch(e) {} }
      if (navigator.onLine && String(id).indexOf('local_') !== 0) {
        await sb.from('produk').delete().eq('id', id);
        console.log('[DELETE][ONLINE] Produk:', id, '| DB+Supabase');
      } else {
        console.log('[DELETE][OFFLINE] Produk:', id, '| DB');
      }
      return { success: true };
    } catch (error) {
      console.error('[PRODUK] Gagal hapus:', error.message);
      return { success: false, error: error };
    }
  }
  
// ==================== TRANSAKSI ====================
async getTransaksi(startDate, endDate) {
  try {
    // ===== PRIORITAS: Supabase dulu jika online =====
    if (navigator.onLine) {
      try {
        return await this._getTransaksiOnline(startDate, endDate);
      } catch (onlineErr) {
        console.warn('[TRANSAKSI] Supabase gagal, fallback ke IndexedDB:', onlineErr.message);
      }
    }

    // ===== FALLBACK: IndexedDB =====
    return await this._getTransaksiOffline(startDate, endDate);
  } catch (error) {
    console.error('getTransaksi error:', error);
    return { data: [], error: error };
  }
}

// ==================== TRANSAKSI ONLINE (Supabase) ====================
async _getTransaksiOnline(startDate, endDate) {
  var transaksiQuery = sb.from('transaksi').select('*');

  if (startDate) {
    // Gunakan awal hari (T00:00:00) untuk start date
    transaksiQuery = transaksiQuery.gte('created_at', startDate + 'T00:00:00');
  }
  if (endDate) {
    // Gunakan akhir hari (T23:59:59) untuk end date
    transaksiQuery = transaksiQuery.lte('created_at', endDate + 'T23:59:59');
  }

  var { data: transaksi, error: trxErr } = await transaksiQuery;
  if (trxErr) throw trxErr;

  if (!transaksi || transaksi.length === 0) {
    return { data: [], error: null };
  }

  // Sort by created_at descending
  transaksi.sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Fetch detail_transaksi untuk semua transaksi
  var allDetails = [];
  for (var i = 0; i < transaksi.length; i++) {
    var { data: details } = await sb
      .from('detail_transaksi')
      .select('*')
      .eq('transaksi_id', transaksi[i].id);
    if (details && details.length > 0) {
      allDetails = allDetails.concat(details);
    }
  }

  // Fetch produk untuk mapping
  var { data: produkList } = await sb.from('produk').select('*');
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

  console.log('[TRANSAKSI][ONLINE] Loaded', result.length, 'transaksi dari Supabase');
  return { data: result, error: null };
}

// ==================== TRANSAKSI OFFLINE (IndexedDB) ====================
async _getTransaksiOffline(startDate, endDate) {
  var transaksi = await window.localDB.getAll('transaksi') || [];
    
  if (startDate && endDate) {
    transaksi = transaksi.filter(function(t) {
      if (!t.created_at) return false;
      
      // Bandingkan sebagai string tanggal (YYYY-MM-DD)
      var tglOnly = t.created_at.split('T')[0];
      var startOnly = startDate.split('T')[0];
      var endOnly = endDate.split('T')[0];
      
      return tglOnly >= startOnly && tglOnly <= endOnly;
    });
  }
  
  transaksi.sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });
  
  var details = await window.localDB.getAll('detail_transaksi') || [];
  // Attach product objects to each detail_transaksi for easier rendering
  var produkList = await window.localDB.getAll('produk') || [];
  var produkMap = {};
  for (var pi = 0; pi < produkList.length; pi++) {
    var p = produkList[pi];
    if (p && p.id !== undefined) produkMap[p.id] = p;
  }

  var result = transaksi.map(function(t) {
    var newT = Object.assign({}, t);
    newT.detail_transaksi = details.filter(function(d) {
      return d.transaksi_id === t.id;
    }).map(function(d) {
      var nd = Object.assign({}, d);
      nd.produk = produkMap[d.produk_id] || null;
      return nd;
    });
    return newT;
  });

  console.log('[TRANSAKSI][OFFLINE] Loaded', result.length, 'transaksi dari IndexedDB');
  return { data: result, error: null };
}
  
// ==================== SAVE TRANSAKSI ====================
async saveTransaksi(transaksiData, cart, userId) {
  try {
    var offlineUserId = localStorage.getItem('offline_user_id');
    var now = new Date();
    var localTimeForDisplay = now.toISOString();
    
    var isOfflineDevice = !this._isOnlineOnly();

    // ===== ONLINE: Supabase dulu, baru IndexedDB =====
    if (navigator.onLine) {
      try {
        // Insert ke Supabase dulu (biar Supabase generate UUID)
        var insertData = {
          total: transaksiData.total,
          total_laba: transaksiData.total_laba,
          nama_pembeli: transaksiData.nama_pembeli || null
          // Jangan kirim created_at, biarkan Supabase isi dengan now()
        };
        
        // Hanya kirim user_id jika valid (bukan ID lokal offline)
        var currentUserId = userId || offlineUserId;
        if (currentUserId && !currentUserId.startsWith('offline_')) {
          insertData.user_id = currentUserId;
        }
        
        var { data: trx, error: trxErr } = await sb.from('transaksi').insert(insertData).select().single();
        if (trxErr) throw trxErr;
        
        var trxId = trx.id; // UUID dari Supabase
        console.log('[TRANSAKSI][ONLINE] Inserted to Supabase, UUID:', trxId);
        
        // Insert detail_transaksi ke Supabase
        for (var i = 0; i < cart.length; i++) {
          var item = cart[i];
          await sb.from('detail_transaksi').insert({
            transaksi_id: trxId,
            produk_id: item.id,
            qty: item.qty,
            harga: item.harga_jual,
            subtotal: item.qty * item.harga_jual,
            laba: item.qty * (item.harga_jual - item.harga_beli)
          });
          
          // Update stok di Supabase
          try {
            var { data: produkData } = await sb.from('produk').select('stok').eq('id', item.id).single();
            if (produkData) {
              await sb.from('produk').update({ stok: (produkData.stok || 0) - item.qty }).eq('id', item.id);
            }
          } catch (stokErr) {
            console.warn('Update stok Supabase error:', stokErr);
          }
        }
        
        // Simpan ke IndexedDB dengan UUID Supabase
        if (isOfflineDevice) {
          var transaksi = {
            id: trxId,
            user_id: currentUserId,
            total: transaksiData.total,
            total_laba: transaksiData.total_laba,
            nama_pembeli: transaksiData.nama_pembeli || null,
            created_at: trx.created_at || localTimeForDisplay
          };
          await window.localDB.save('transaksi', transaksi, trxId);
          
          for (var j = 0; j < cart.length; j++) {
            var item2 = cart[j];
            await window.localDB.save('detail_transaksi', {
              transaksi_id: trxId,
              produk_id: item2.id,
              qty: item2.qty,
              harga: item2.harga_jual,
              subtotal: item2.qty * item2.harga_jual,
              laba: item2.qty * (item2.harga_jual - item2.harga_beli),
              created_at: localTimeForDisplay
            });
            
            // Update stok di IndexedDB
            var produk = await window.localDB.getById('produk', item2.id);
            if (produk) {
              produk.stok = (produk.stok || 0) - item2.qty;
              await window.localDB.save('produk', produk, produk.id);
            }
          }
          console.log('[TRANSAKSI][ONLINE] Saved to IndexedDB with UUID:', trxId);
        }
        
        return { success: true, id: trxId };
      } catch (onlineErr) {
        console.warn('[TRANSAKSI] Supabase insert gagal, fallback offline:', onlineErr.message);
        // Jatuhkan ke path offline di bawah
      }
    }
    
    // ===== OFFLINE: IndexedDB + sync queue =====
    var trxId = 'trx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    var transaksi = {
      id: trxId,
      user_id: userId || offlineUserId,
      total: transaksiData.total,
      total_laba: transaksiData.total_laba,
      nama_pembeli: transaksiData.nama_pembeli || null,
      created_at: localTimeForDisplay
    };
    
    console.log('[TRANSAKSI][OFFLINE] Saving locally:', trxId);
    
    await window.localDB.save('transaksi', transaksi, trxId);
    
    for (var k = 0; k < cart.length; k++) {
      var item3 = cart[k];
      await window.localDB.save('detail_transaksi', {
        transaksi_id: trxId,
        produk_id: item3.id,
        qty: item3.qty,
        harga: item3.harga_jual,
        subtotal: item3.qty * item3.harga_jual,
        laba: item3.qty * (item3.harga_jual - item3.harga_beli),
        created_at: localTimeForDisplay
      });
      
      // Update stok
      var produk = await window.localDB.getById('produk', item3.id);
      if (produk) {
        produk.stok = (produk.stok || 0) - item3.qty;
        await window.localDB.save('produk', produk, produk.id);
      }
    }
    
    // Tambahkan ke sync queue agar bisa di-sync nanti saat online
    await window.localDB.addToSyncQueue('transaksi', 'insert', transaksi, trxId);
    console.log('[TRANSAKSI][OFFLINE] Added to sync queue:', trxId);
    
    return { success: true, id: trxId };
  } catch (error) {
    console.error('saveTransaksi error:', error);
    return { success: false, error: error };
  }
}

// ==================== SYNC TRANSAKSI KE SERVER ====================
// Digunakan untuk sync transaksi offline (dari sync queue) ke Supabase
// Setelah sync, update ID lokal ke UUID Supabase
async syncTransaksiToServer(transaksiData, cartItems, syncQueueId) {
  try {
    var localId = transaksiData.id;
    console.log('[TRANSAKSI] Syncing to server:', localId);
    
    var currentUserId = localStorage.getItem('offline_user_id');
    var isOfflineUserId = currentUserId && currentUserId.startsWith('offline_');
    
    // Insert ke Supabase (tanpa ID lokal, biarkan Supabase generate UUID)
    var insertData = {
      total: transaksiData.total,
      total_laba: transaksiData.total_laba,
      nama_pembeli: transaksiData.nama_pembeli || null,
      created_at: transaksiData.created_at || new Date().toISOString()
    };
    
    if (!isOfflineUserId) {
      insertData.user_id = currentUserId;
    }
    
    var { data: trx, error: trxErr } = await sb.from('transaksi').insert(insertData).select().single();
    if (trxErr) throw trxErr;
    
    var serverId = trx.id; // UUID dari Supabase
    console.log('[TRANSAKSI] Supabase UUID:', serverId, '(was local:', localId, ')');
    
    // Insert detail_transaksi ke Supabase
    for (var i = 0; i < cartItems.length; i++) {
      var item = cartItems[i];
      await sb.from('detail_transaksi').insert({
        transaksi_id: serverId,
        produk_id: item.produk_id || item.id,
        qty: item.qty,
        harga: item.harga,
        subtotal: item.subtotal || (item.qty * item.harga),
        laba: item.laba || 0
      });
    }
    
    // Update stok di Supabase
    for (var j = 0; j < cartItems.length; j++) {
      var ci = cartItems[j];
      try {
        var { data: produkData } = await sb.from('produk').select('stok').eq('id', ci.produk_id || ci.id).single();
        if (produkData) {
          await sb.from('produk').update({ stok: (produkData.stok || 0) - ci.qty }).eq('id', ci.produk_id || ci.id);
        }
      } catch (stokErr) {
        console.warn('Update stok error:', stokErr);
      }
    }
    
    // ===== UPDATE LOCAL IndexedDB: hapus ID lokal, simpan dengan UUID Supabase =====
    if (!this._isOnlineOnly()) {
      try {
        // Hapus record lama dari IndexedDB
        await window.localDB.delete('transaksi', localId);
        
        // Simpan record baru dengan UUID Supabase
        await window.localDB.save('transaksi', {
          id: serverId,
          user_id: transaksiData.user_id,
          total: transaksiData.total,
          total_laba: transaksiData.total_laba,
          nama_pembeli: transaksiData.nama_pembeli || null,
          created_at: trx.created_at || transaksiData.created_at
        }, serverId);
        
        // Update semua detail_transaksi: ubah transaksi_id dari lokal ke UUID
        var allDetails = await window.localDB.getAll('detail_transaksi') || [];
        for (var d = 0; d < allDetails.length; d++) {
          var detail = allDetails[d];
          if (detail.transaksi_id === localId) {
            // Hapus record lama
            if (detail.id) await window.localDB.delete('detail_transaksi', detail.id);
            // Simpan dengan transaksi_id baru
            detail.transaksi_id = serverId;
            delete detail.id; // biarkan IndexedDB generate auto-increment baru
            await window.localDB.save('detail_transaksi', detail);
          }
        }
        
        console.log('[TRANSAKSI] Local IndexedDB updated:', localId, '->', serverId);
      } catch (localErr) {
        console.warn('[TRANSAKSI] Gagal update local:', localErr.message);
      }
    }
    
    // Tandai sync queue sebagai complete
    if (syncQueueId) {
      await window.localDB.markSyncComplete(syncQueueId);
    }
    
    console.log('[TRANSAKSI] Sync complete:', serverId);
    return { success: true, serverId: serverId };
    
  } catch (error) {
    console.error('[TRANSAKSI] Sync gagal:', error);
    return { success: false, error: error.message };
  }
}

// ==================== PROSES ANTRIAN TRANSAKSI OFFLINE ====================
// Dipanggil saat online untuk sync transaksi offline ke Supabase
async processPendingTransaksiSync() {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  
  try {
    var pendingItems = await window.localDB.getPendingSync();
    var transaksiItems = pendingItems.filter(function(item) {
      return item.table_name === 'transaksi' && item.action === 'insert';
    });
    
    if (transaksiItems.length === 0) {
      console.log('[TRANSAKSI] Tidak ada transaksi offline perlu di-sync');
      return { synced: 0, failed: 0 };
    }
    
    console.log('[TRANSAKSI] Syncing', transaksiItems.length, 'transaksi offline...');
    
    var synced = 0;
    var failed = 0;
    
    for (var i = 0; i < transaksiItems.length; i++) {
      var queueItem = transaksiItems[i];
      try {
        var transaksiData = queueItem.data;
        var localId = transaksiData.id;
        
        // Ambil detail_transaksi dari IndexedDB berdasarkan transaksi_id
        var allDetails = await window.localDB.getAll('detail_transaksi') || [];
        var cartItems = allDetails.filter(function(d) {
          return d.transaksi_id === localId;
        }).map(function(d) {
          return {
            produk_id: d.produk_id,
            qty: d.qty,
            harga: d.harga,
            subtotal: d.subtotal,
            laba: d.laba
          };
        });
        
        var result = await this.syncTransaksiToServer(
          transaksiData,
          cartItems,
          queueItem.id
        );
        
        if (result.success) {
          synced++;
          console.log('[TRANSAKSI] Synced:', localId, '->', result.serverId);
        } else {
          failed++;
          console.warn('[TRANSAKSI] Failed:', localId, result.error);
          await window.localDB.markSyncFailed(queueItem.id);
        }
      } catch (itemErr) {
        failed++;
        console.error('[TRANSAKSI] Error syncing item:', itemErr);
        await window.localDB.markSyncFailed(queueItem.id);
      }
    }
    
    console.log('[TRANSAKSI] Sync selesai:', synced, 'berhasil,', failed, 'gagal');
    return { synced: synced, failed: failed };
    
  } catch (error) {
    console.error('[TRANSAKSI] processPendingTransaksiSync error:', error);
    return { synced: 0, failed: 0 };
  }
}
  
  // Sync user role dari server ke localStorage
async syncUserRole() {
  if (!navigator.onLine) {
    console.log('Offline, cannot sync role');
    return false;
  }
  
  try {
    const userId = localStorage.getItem('offline_user_id');
    if (!userId) return false;
    
    const { data: profile, error } = await sb
      .from('profiles')
      .select('role, nama')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) throw error;
    
    if (profile) {
      localStorage.setItem('offline_user_role', profile.role);
      localStorage.setItem('offline_user_name', profile.nama);
      window.currentRole = profile.role;
      console.log('✅ Role synced from server:', profile.role);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Sync user role error:', error);
    return false;
  }
}

  // ==================== PROFILES ====================
  async getProfiles() {
    try {
      var profiles = await window.localDB.getAll('profiles') || [];
      return { data: profiles, error: null };
    } catch (error) {
      return { data: [], error: error };
    }
  }
  
  // ==================== MASTER KELAS ====================
  
  // Get all kelas
  async getAllKelas() {
    try {
      // ===== PRIORITAS: Supabase dulu jika online =====
      if (navigator.onLine) {
        try {
          const { data: kelasList, error } = await sb.from('master_kelas').select('*').order('nama_kelas');
          if (error) throw error;
          console.log('[KELAS][ONLINE] Fetched', (kelasList || []).length, 'kelas from Supabase');
          return { data: kelasList || [], error: null };
        } catch (onlineErr) {
          console.warn('[KELAS] Supabase gagal, fallback IndexedDB:', onlineErr.message);
        }
      }

      // ===== FALLBACK: IndexedDB =====
      var kelas = await window.localDB.getAll('master_kelas') || [];
      kelas.sort(function(a, b) {
        var namaA = a.nama_kelas || '';
        var namaB = b.nama_kelas || '';
        return namaA.localeCompare(namaB);
      });
      return { data: kelas, error: null };
    } catch (error) {
      console.error('getAllKelas error:', error);
      return { data: [], error: error };
    }
  }
  
  // Get kelas by id
  async getKelasById(id) {
    try {
      var kelas = await window.localDB.getById('master_kelas', id);
      return { data: kelas, error: null };
    } catch (error) {
      console.error('getKelasById error:', error);
      return { data: null, error: error };
    }
  }
  
  // Save kelas (insert or update)
  async saveKelas(data, id) {
  try {
    var isOfflineDevice = !this._isOnlineOnly();
    var now = new Date().toISOString();
    var saveId = null; // akan diisi setelah Supabase merespon

    if (navigator.onLine) {
      // ===== ONLINE: Supabase dulu, lalu IndexedDB =====
      if (id) {
        // UPDATE existing kelas
        const { error } = await sb
          .from('master_kelas')
          .update({
            nama_kelas: data.nama_kelas,
            deskripsi: data.deskripsi || '',
            updated_at: now,
            arrived_at: now
          })
          .eq('id', id);
        if (error) throw error;
        saveId = id;
        console.log('✅ Kelas updated ke Supabase:', data.nama_kelas);
        // Update IndexedDB juga
        if (isOfflineDevice) {
          var kelasData = {
            id: saveId,
            nama_kelas: data.nama_kelas,
            deskripsi: data.deskripsi || '',
            created_at: data.created_at || now,
            updated_at: now,
            arrived_at: now
          };
          await window.localDB.save('master_kelas', kelasData, saveId);
          console.log('💾 IndexedDB updated for kelas:', saveId);
        }
      } else {
        // INSERT baru ke Supabase — biar Supabase generate UUID
        var insertData = {
          nama_kelas: data.nama_kelas,
          deskripsi: data.deskripsi || '',
          created_at: now,
          updated_at: now,
          arrived_at: now
        };
        const { data: inserted, error } = await sb
          .from('master_kelas')
          .insert(insertData)
          .select()
          .single();
        if (error) throw error;
        if (!inserted) throw new Error('Insert returned no data');
        saveId = inserted.id; // UUID asli dari Supabase
        console.log('✅ Kelas inserted ke Supabase:', inserted.nama_kelas, 'ID:', saveId);
        // Save ke IndexedDB dengan UUID asli
        if (isOfflineDevice) {
          await window.localDB.save('master_kelas', inserted, saveId);
          console.log('💾 Saved to IndexedDB with server UUID:', saveId);
        }
      }
    } else {
      // ===== OFFLINE: hanya IndexedDB =====
      if (isOfflineDevice) {
        saveId = id || data.id || 'kelas_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        var kelasData = {
          id: saveId,
          nama_kelas: data.nama_kelas,
          deskripsi: data.deskripsi || '',
          created_at: data.created_at || now,
          updated_at: now,
          arrived_at: now
        };
        await window.localDB.save('master_kelas', kelasData, saveId);
        await window.localDB.addToSyncQueue('master_kelas', id ? 'update' : 'insert', kelasData, saveId);
        console.log('💾 Saved to IndexedDB (offline), ID:', saveId);
      }
    }
    
    return { success: true, id: saveId };
  } catch (error) {
    console.error('saveKelas error:', error);
    return { success: false, error: error };
  }
}

// Delete kelas dari lokal dan Supabase
async deleteKelas(id) {
  try {
    var isOfflineDevice = !this._isOnlineOnly();
    // Hapus dari IndexedDB (hanya jika boleh offline)
    if (isOfflineDevice) {
      try { await window.localDB.delete('master_kelas', id); } catch(e) {}
    }
    
    // Hapus dari Supabase jika online
    if (navigator.onLine && String(id).indexOf('kelas_') !== 0) {
      const { error } = await sb.from('master_kelas').delete().eq('id', id);
      if (error) throw error;
      console.log('✅ Kelas deleted dari Supabase:', id);
    } else if (isOfflineDevice && String(id).indexOf('kelas_') === 0) {
      // ID lokal, tambahkan ke antrian
      await window.localDB.addToSyncQueue('master_kelas', 'delete', { id: id }, id);
    }
    
    return { success: true };
  } catch (error) {
    console.error('deleteKelas error:', error);
    return { success: false, error: error };
  }
}

// ==================== SYNC KELAS DARI SUPABASE (DOWNLOAD) ====================
async syncKelasFromSupabase() {
  if (!navigator.onLine) return { success: false, message: 'Offline' };
  
  try {
    const { data: kelasList, error } = await sb
      .from('master_kelas')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    if (!kelasList || kelasList.length === 0) return { success: true, added: 0, updated: 0 };
    
    // Simpan semua kelas dari server (dengan UUID)
    for (const kelas of kelasList) {
      await window.localDB.save('master_kelas', kelas, kelas.id);
    }
    
    // Hapus record lokal lama yang punya ID kelas_xxx (bukan UUID)
    const allLocal = await window.localDB.getAll('master_kelas') || [];
    let deletedOld = 0;
    const deletedKelasLog = [];
    const serverIds = kelasList.map(k => k.id);
    
    for (const local of allLocal) {
      if (String(local.id).indexOf('kelas_') === 0) {
        // Record lama dengan ID lokal, hapus
        await window.localDB.delete('master_kelas', local.id);
        deletedKelasLog.push({
          id: local.id,
          nama: local.nama_kelas || '(unknown)'
        });
        deletedOld++;
      }
    }
    
    if (deletedOld > 0) {
      console.log('[SYNC] Deleted old kelas_xxx records:', deletedOld);
      deletedKelasLog.forEach((log, i) => {
        console.log(`  ${i + 1}. "${log.nama}" (${log.id})`);
      });
    }
    
    // Perbaiki kelas_ids di produk yang masih pakai ID lokal
    const serverKelasByName = {};
    for (const k of kelasList) { serverKelasByName[k.nama_kelas] = k.id; }
    
    let produkFixed = 0;
    const allProduk = await window.localDB.getAll('produk') || [];
    const produkRemapLog = [];
    
    for (const p of allProduk) {
      let changed = false;
      const oldKelasIds = Array.isArray(p.kelas_ids) ? [...p.kelas_ids] : [];
      
      if (Array.isArray(p.kelas_ids)) {
        for (let i = 0; i < p.kelas_ids.length; i++) {
          if (String(p.kelas_ids[i]).indexOf('kelas_') === 0) {
            // ID lokal, cari UUID server berdasarkan nama
            const nama = window.kelasMap ? window.kelasMap[p.kelas_ids[i]] : null;
            if (nama && serverKelasByName[nama]) {
              p.kelas_ids[i] = serverKelasByName[nama];
              changed = true;
            }
          }
        }
      }
      if (changed) {
        await window.localDB.save('produk', p, p.id);
        produkRemapLog.push({
          produkId: p.id,
          produkNama: p.nama || '(unknown)',
          oldKelasIds: oldKelasIds,
          newKelasIds: p.kelas_ids
        });
        produkFixed++;
      }
    }
    
    if (produkFixed > 0) {
      console.log('[SYNC] Produk kelas_ids remapped:', produkFixed);
      produkRemapLog.forEach((log, i) => {
        console.log(`  ${i + 1}. Produk "${log.produkNama}" (${log.produkId.substring(0, 8)}...)`);
        console.log(`     OLD: ${JSON.stringify(log.oldKelasIds)}`);
        console.log(`     NEW: ${JSON.stringify(log.newKelasIds)}`);
      });
    }
    
    // Refresh kelasMap
    if (typeof window.refreshKelasData === 'function') await window.refreshKelasData();
    
    localStorage.setItem('last_kelas_sync', new Date().toLocaleString('id-ID'));
    
    const result = { success: true, added: kelasList.length, deletedOld: deletedOld, produkFixed: produkFixed, serverTotal: kelasList.length };
    console.log('[SYNC] Kelas selesai:', JSON.stringify(result));
    return result;
    
  } catch (error) {
    console.error('[SYNC] Kelas gagal:', error.message);
    return { success: false, error: error.message };
  }
}

// ==================== SYNC KELAS KE SUPABASE (UPLOAD) ====================
async syncKelasToSupabase() {
  if (!navigator.onLine) {
    console.log('📡 Offline, cannot sync kelas to server');
    return { success: false, message: 'Offline' };
  }
  
  try {
    console.log('🔄 Starting sync kelas to Supabase...');
    
    // Ambil semua kelas dari lokal
    const kelasData = await this.getAllKelas();
    const kelasList = kelasData.data || [];
    
    console.log(`📚 Local kelas count: ${kelasList.length}`);
    
    if (kelasList.length === 0) {
      console.log('📚 No kelas data in local');
      return { success: true, uploaded: 0 };
    }
    
    let uploaded = 0;
    let errors = [];
    
    for (const kelas of kelasList) {
      try {
        console.log(`📤 Syncing kelas: ${kelas.nama_kelas} (ID: ${kelas.id})`);
        
        const now = new Date().toISOString();
        
        // Siapkan data
        const kelasDataToSync = {
          id: kelas.id,
          nama_kelas: kelas.nama_kelas,
          deskripsi: kelas.deskripsi || '',
          created_at: kelas.created_at || now,
          updated_at: now,
          arrived_at: now
        };
        
        // Gunakan upsert (insert or update)
        const { error } = await sb
          .from('master_kelas')
          .upsert(kelasDataToSync, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error(`❌ Error syncing kelas ${kelas.nama_kelas}:`, error);
          errors.push({ nama: kelas.nama_kelas, error: error.message });
        } else {
          uploaded++;
          console.log(`✅ Kelas synced: ${kelas.nama_kelas}`);
        }
        
      } catch (err) {
        console.error(`❌ Failed sync kelas ${kelas.nama_kelas}:`, err.message);
        errors.push({ nama: kelas.nama_kelas, error: err.message });
      }
    }
    
    console.log(`✅ Sync kelas to server selesai: ${uploaded} berhasil, ${errors.length} gagal`);
    
    if (uploaded > 0) {
      localStorage.setItem('last_kelas_sync', new Date().toLocaleString('id-ID'));
    }
    
    return { success: true, uploaded: uploaded, errors: errors, total: kelasList.length };
    
  } catch (error) {
    console.error('❌ Sync kelas to Supabase error:', error);
    return { success: false, error: error.message };
  }
}
  
  // Get produk by kelas_id
  async getProdukByKelasId(kelasId) {
    try {
      // ===== PRIORITAS: Supabase dulu jika online =====
      if (navigator.onLine) {
        try {
          const { data: allProduk } = await window.syncManager.fetchProdukWithKelas('*');
          let filtered = (allProduk || []).filter(function(p) {
            if (!p) return false;
            if (Array.isArray(p.kelas_ids) && p.kelas_ids.indexOf(kelasId) !== -1) return true;
            if (p.kelas_id && p.kelas_id === kelasId) return true;
            return false;
          });
          filtered = this._enrichKelasNames(filtered);
          return { data: filtered, error: null };
        } catch (onlineErr) {
          console.warn('[PRODUK] Supabase getProdukByKelasId gagal, fallback IndexedDB:', onlineErr.message);
        }
      }

      // ===== FALLBACK: IndexedDB =====
      var produk = await window.localDB.getAll('produk') || [];
      var filtered = produk.filter(function(p) {
        if (!p) return false;
        if (Array.isArray(p.kelas_ids) && p.kelas_ids.indexOf(kelasId) !== -1) return true;
        if (p.kelas_id && p.kelas_id === kelasId) return true; // backward compat
        return false;
      });
      // Enrich kelas_names for badge rendering
      if (typeof window.refreshKelasData === 'function') {
        await window.refreshKelasData();
      }
      filtered = this._enrichKelasNames(filtered);
      return { data: filtered, error: null };
    } catch (error) {
      console.error('getProdukByKelasId error:', error);
      return { data: [], error: error };
    }
  }
  
  // Sync master kelas from Supabase
  async syncMasterKelas() {
    if (!navigator.onLine) {
      console.log('Offline, cannot sync master kelas');
      return false;
    }
    
    try {
      console.log('Syncing master kelas from Supabase...');
      var response = await sb.from('master_kelas').select('*');
      var kelasList = response.data;
      
      if (kelasList && kelasList.length > 0) {
        for (var i = 0; i < kelasList.length; i++) {
          var k = kelasList[i];
          await window.localDB.save('master_kelas', k, k.id);
        }
        console.log('Synced', kelasList.length, 'master kelas');
      }
      return true;
    } catch (error) {
      console.error('Sync master kelas failed:', error);
      return false;
    }
  }
  
  // ==================== SYNC GAMBAR KE LOKAL ====================
async downloadImagesToLocal() {
  if (!navigator.onLine) {
    console.log('Offline, cannot download images');
    return false;
  }
  
  try {
    var produk = await window.localDB.getAll('produk') || [];
    var count = 0;
    
    for (var i = 0; i < produk.length; i++) {
      var p = produk[i];
      if (p.gambar_url && p.gambar_url.startsWith('http')) {
        // Cek apakah sudah ada gambar lokal
        var existingImage = await window.localDB.getImageLocally(p.id);
        if (!existingImage) {
          try {
            // Download gambar dan konversi ke Base64
            var response = await fetch(p.gambar_url);
            var blob = await response.blob();
            var base64 = await new Promise(function(resolve) {
              var reader = new FileReader();
              reader.onloadend = function() { resolve(reader.result); };
              reader.readAsDataURL(blob);
            });
            
            await window.localDB.saveImageLocally(p.id, base64);
            count++;
            console.log('✅ Downloaded image for:', p.nama);
          } catch(err) {
            console.warn('Failed to download image for:', p.nama, err);
          }
        }
      }
    }
    
    console.log('📸 Downloaded', count, 'images to local storage');
    return true;
  } catch(error) {
    console.error('Download images error:', error);
    return false;
  }
}
  
  // ==================== SYNC ALL WITH PROGRESS ====================
  async syncAll(onProgress) {
    if (!navigator.onLine) {
      console.log('Offline, cannot sync');
      if (onProgress) onProgress({ type: 'error', message: 'Tidak ada koneksi internet' });
      return false;
    }
    
    try {
      if (onProgress) {
        onProgress({ type: 'start', message: 'Menyiapkan sinkronisasi...' });
      }
      
      // 1. Sync master kelas
      if (onProgress) {
        onProgress({ type: 'progress', stage: 'master_kelas', message: 'Mengunduh data kelas...', current: 0, total: 0 });
      }
      await this.syncMasterKelas();
      
      // 2. Sync produk (with kelas associations)
      if (onProgress) {
        onProgress({ type: 'progress', stage: 'produk', message: 'Mengunduh data produk...', current: 0, total: 0 });
      }
	  
	  // Di dalam fungsi syncAll, setelah sync produk, tambahkan:
		if (onProgress) {
		  onProgress({ type: 'progress', stage: 'gambar', message: 'Mengunduh gambar produk...', current: 0, total: 0 });
		}
		await this.downloadImagesToLocal();
      
      // Fetch produk WITH kelas associations using sync manager
      console.log('📥 syncAll: Fetching produk with kelas...');
      var { data: produk } = await window.syncManager.fetchProdukWithKelas('*');
      console.log('📦 syncAll: Received', produk ? produk.length : 0, 'produk from sync manager');
      
      if (produk) {
        for (var i = 0; i < produk.length; i++) {
          const p = produk[i];
          console.log('💾 Saving produk', i+1, '/', produk.length, '- ID:', p.id, '- kelas_ids:', p.kelas_ids);
          await window.localDB.save('produk', p, p.id);
          if (onProgress) {
            var percent = Math.round(((i + 1) / produk.length) * 100);
            onProgress({
              type: 'progress',
              stage: 'produk',
              message: 'Mengunduh produk (' + (i+1) + '/' + produk.length + ')',
              current: i + 1,
              total: produk.length,
              percent: percent
            });
          }
        }
        console.log('✅ Synced', produk.length, 'produk with kelas');
      }
      
      // 3. Sync profiles
      if (onProgress) {
        onProgress({ type: 'progress', stage: 'profiles', message: 'Mengunduh data profil...', current: 0, total: 0 });
      }
      
      var profilesResponse = await sb.from('profiles').select('*');
      var profiles = profilesResponse.data;
      if (profiles) {
        for (var j = 0; j < profiles.length; j++) {
          await window.localDB.save('profiles', profiles[j], profiles[j].id);
          if (onProgress) {
            var percent2 = Math.round(((j + 1) / profiles.length) * 100);
            onProgress({
              type: 'progress',
              stage: 'profiles',
              message: 'Mengunduh profil (' + (j+1) + '/' + profiles.length + ')',
              current: j + 1,
              total: profiles.length,
              percent: percent2
            });
          }
        }
        console.log('Synced', profiles.length, 'profiles');
      }
      
      // 4. Sync transaksi (last 30 days)
      if (onProgress) {
        onProgress({ type: 'progress', stage: 'transaksi', message: 'Mengunduh riwayat transaksi...', current: 0, total: 0 });
      }
      
      var thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      var transaksiResponse = await sb
        .from('transaksi')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      var transaksi = transaksiResponse.data;
      if (transaksi) {
        for (var k = 0; k < transaksi.length; k++) {
          await window.localDB.save('transaksi', transaksi[k], transaksi[k].id);
          
          // Sync details for this transaction
          var detailsResponse = await sb
            .from('detail_transaksi')
            .select('*')
            .eq('transaksi_id', transaksi[k].id);
          
          var details = detailsResponse.data;
          if (details) {
            for (var d = 0; d < details.length; d++) {
              await window.localDB.save('detail_transaksi', details[d]);
            }
          }
          
          if (onProgress) {
            var percent3 = Math.round(((k + 1) / transaksi.length) * 100);
            onProgress({
              type: 'progress',
              stage: 'transaksi',
              message: 'Mengunduh transaksi (' + (k+1) + '/' + transaksi.length + ')',
              current: k + 1,
              total: transaksi.length,
              percent: percent3
            });
          }
        }
        console.log('Synced', transaksi.length, 'transaksi');
      }
      
      // 5. Proses transaksi offline yang perlu di-sync ke Supabase
      if (onProgress) {
        onProgress({ type: 'progress', stage: 'transaksi_upload', message: 'Mengunggah transaksi offline...', current: 0, total: 0 });
      }
      var transaksiSyncResult = await this.processPendingTransaksiSync();
      if (transaksiSyncResult.synced > 0) {
        console.log('[SYNC] Uploaded', transaksiSyncResult.synced, 'offline transactions to Supabase');
      }
      
      if (onProgress) {
        onProgress({ type: 'complete', message: 'Sinkronisasi selesai!' });
      }
      
      return true;
    } catch (error) {
      console.error('Sync all failed:', error);
      if (onProgress) {
        onProgress({ type: 'error', message: error.message || 'Gagal menyinkronkan data' });
      }
      return false;
    }
  }
}

window.offlineCore = new OfflineCore();