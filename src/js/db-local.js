// js/db-local.js
const DB_NAME = 'kitab-madin-database';
const DB_VERSION = 9;  // bumped for offline_devices store

class LocalDB {
  constructor() { 
    this.db = null; 
  }
  
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => { 
        this.db = request.result; 
        console.log('✅ IndexedDB connected, version:', DB_VERSION);
        resolve(this.db); 
      };
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        const oldVersion = e.oldVersion;
        
        console.log('🔄 Upgrading database from version', oldVersion, 'to', DB_VERSION);
        
        // NOTE: don't delete existing stores to preserve local data.
        // Ensure stores and indexes exist, and perform migrations as needed.

        // ===== CREATE/UPDATE OBJECT STORES =====

        // 1. Store produk (preserve data if exists)
        let produkStore;
        if (db.objectStoreNames.contains('produk')) {
          produkStore = e.target.transaction.objectStore('produk');
          // ensure indexes exist
          try { if (!produkStore.indexNames.contains('nama')) produkStore.createIndex('nama', 'nama', { unique: false }); } catch (err) {}
          try { if (!produkStore.indexNames.contains('kategori')) produkStore.createIndex('kategori', 'kategori', { unique: false }); } catch (err) {}
          try { if (!produkStore.indexNames.contains('kelas_id')) produkStore.createIndex('kelas_id', 'kelas_id', { unique: false }); } catch (err) {}
          try { if (!produkStore.indexNames.contains('harga_jual')) produkStore.createIndex('harga_jual', 'harga_jual', { unique: false }); } catch (err) {}
          try { if (!produkStore.indexNames.contains('stok')) produkStore.createIndex('stok', 'stok', { unique: false }); } catch (err) {}
          // add multiEntry index for kelas_ids
          try { if (!produkStore.indexNames.contains('kelas_ids')) produkStore.createIndex('kelas_ids', 'kelas_ids', { multiEntry: true }); } catch (err) {}
          console.log('✅ Updated existing store: produk (indexes ensured)');
        } else {
          produkStore = db.createObjectStore('produk', { keyPath: 'id' });
          produkStore.createIndex('nama', 'nama', { unique: false });
          produkStore.createIndex('kategori', 'kategori', { unique: false });
          produkStore.createIndex('kelas_id', 'kelas_id', { unique: false });
          produkStore.createIndex('harga_jual', 'harga_jual', { unique: false });
          produkStore.createIndex('stok', 'stok', { unique: false });
          produkStore.createIndex('kelas_ids', 'kelas_ids', { multiEntry: true });
          console.log('✅ Created store: produk');
        }
        
        // 2. Store transaksi (DENGAN NAMA_PEMBELI)
        const transaksiStore = db.createObjectStore('transaksi', { keyPath: 'id' });
        transaksiStore.createIndex('created_at', 'created_at', { unique: false });
        transaksiStore.createIndex('user_id', 'user_id', { unique: false });
        transaksiStore.createIndex('nama_pembeli', 'nama_pembeli', { unique: false }); // INDEX BARU
        console.log('✅ Created store: transaksi with nama_pembeli');
        
        // 3. Store detail_transaksi
        const detailStore = db.createObjectStore('detail_transaksi', { keyPath: 'id', autoIncrement: true });
        detailStore.createIndex('transaksi_id', 'transaksi_id', { unique: false });
        detailStore.createIndex('produk_id', 'produk_id', { unique: false });
        console.log('✅ Created store: detail_transaksi');
        
        // 4. Store profiles
        const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
        profileStore.createIndex('role', 'role', { unique: false });
        console.log('✅ Created store: profiles');
        
        // 5. Store syncQueue
        const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        syncQueueStore.createIndex('status', 'status', { unique: false });
        syncQueueStore.createIndex('created_at', 'created_at', { unique: false });
        syncQueueStore.createIndex('table_name', 'table_name', { unique: false });
        console.log('✅ Created store: syncQueue');
        
        // 6. Store master_kelas
        if (!db.objectStoreNames.contains('master_kelas')) {
          const masterKelasStore = db.createObjectStore('master_kelas', { keyPath: 'id' });
          masterKelasStore.createIndex('nama_kelas', 'nama_kelas', { unique: false });
          masterKelasStore.createIndex('created_at', 'created_at', { unique: false });
          console.log('✅ Created store: master_kelas');
        } else {
          const mk = e.target.transaction.objectStore('master_kelas');
          try { if (!mk.indexNames.contains('nama_kelas')) mk.createIndex('nama_kelas', 'nama_kelas', { unique: false }); } catch (err) {}
          try { if (!mk.indexNames.contains('created_at')) mk.createIndex('created_at', 'created_at', { unique: false }); } catch (err) {}
          console.log('✅ Ensured indexes for store: master_kelas');
        }
        
        // 7. Store gambar_produk (OFFLINE IMAGES)
        const gambarStore = db.createObjectStore('gambar_produk', { keyPath: 'id' });
        gambarStore.createIndex('updated_at', 'updated_at', { unique: false });
        console.log('✅ Created store: gambar_produk');
        
        // 8. Store syncLog (tambahan untuk logging)
        if (!db.objectStoreNames.contains('syncLog')) {
          const syncLogStore = db.createObjectStore('syncLog', { keyPath: 'id', autoIncrement: true });
          syncLogStore.createIndex('created_at', 'created_at', { unique: false });
          syncLogStore.createIndex('type', 'type', { unique: false });
          console.log('✅ Created store: syncLog');
        }
        
        // 9. Store offline_devices (DEVICE MANAGEMENT)
        if (!db.objectStoreNames.contains('offline_devices')) {
          const devicesStore = db.createObjectStore('offline_devices', { keyPath: 'device_id' });
          devicesStore.createIndex('id', 'id', { unique: false });
          devicesStore.createIndex('device_name', 'device_name', { unique: false });
          devicesStore.createIndex('allowed', 'allowed', { unique: false });
          devicesStore.createIndex('created_at', 'created_at', { unique: false });
          console.log('✅ Created store: offline_devices');
        }
        
        // ===== MIGRATE EXISTING PRODUK RECORDS: kelas_id -> kelas_ids =====
        try {
          const upgradeTx = e.target.transaction;
          if (upgradeTx && upgradeTx.objectStoreNames.contains('produk')) {
            const pStore = upgradeTx.objectStore('produk');
            const cursorReq = pStore.openCursor();
            cursorReq.onsuccess = (evt) => {
              const cursor = evt.target.result;
              if (cursor) {
                const rec = cursor.value;
                let changed = false;
                if (!Array.isArray(rec.kelas_ids)) {
                  rec.kelas_ids = rec.kelas_id ? [rec.kelas_id] : [];
                  changed = true;
                }
                // optional: normalize empty arrays
                if (Array.isArray(rec.kelas_ids) && rec.kelas_ids.length === 0) {
                  rec.kelas_ids = [];
                }
                if (changed) {
                  const putReq = cursor.update(rec);
                  putReq.onsuccess = () => console.log('Migrated produk record to kelas_ids:', rec.id);
                  putReq.onerror = () => console.error('Error migrating produk record', putReq.error);
                }
                cursor.continue();
              }
            };
            cursorReq.onerror = (err) => console.error('Cursor error during produk migration', err);
          }
        } catch (err) {
          console.error('Migration step failed:', err);
        }

        console.log('✅ Database upgrade complete!');
      };
    });
  }
  
  // ... (method lainnya tetap sama)
  
  // ==================== GAMBAR LOKAL (BASE64) ====================

  async saveImageLocally(produkId, base64Image) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        if (!this.db.objectStoreNames.contains('gambar_produk')) {
          console.warn('Store gambar_produk belum ada');
          resolve(false);
          return;
        }
        
        const tx = this.db.transaction('gambar_produk', 'readwrite');
        const store = tx.objectStore('gambar_produk');
        const request = store.put({ id: produkId, gambar: base64Image, updated_at: new Date().toISOString() });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
      } catch (error) {
        console.error('saveImageLocally error:', error);
        resolve(false);
      }
    });
  }

  async getImageLocally(produkId) {
    if (!this.db) await this.initDB();
    return new Promise((resolve) => {
      try {
        if (!this.db.objectStoreNames.contains('gambar_produk')) {
          resolve(null);
          return;
        }
        
        const tx = this.db.transaction('gambar_produk', 'readonly');
        const store = tx.objectStore('gambar_produk');
        const request = store.get(produkId);
        request.onerror = () => resolve(null);
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.gambar);
          } else {
            resolve(null);
          }
        };
      } catch (error) {
        console.error('getImageLocally error:', error);
        resolve(null);
      }
    });
  }

  async moveImageRecord(oldId, newId) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        if (!this.db.objectStoreNames.contains('gambar_produk')) {
          resolve(false);
          return;
        }

        const tx = this.db.transaction('gambar_produk', 'readwrite');
        const store = tx.objectStore('gambar_produk');
        const getReq = store.get(oldId);

        getReq.onerror = () => reject(getReq.error);
        getReq.onsuccess = () => {
          const record = getReq.result;
          if (!record) {
            resolve(false);
            return;
          }

          const newRecord = {
            ...record,
            id: newId,
            updated_at: new Date().toISOString()
          };

          const putReq = store.put(newRecord);
          putReq.onerror = () => reject(putReq.error);
          putReq.onsuccess = () => {
            if (oldId === newId) {
              resolve(true);
              return;
            }
            const delReq = store.delete(oldId);
            delReq.onerror = () => reject(delReq.error);
            delReq.onsuccess = () => resolve(true);
          };
        };
      } catch (error) {
        console.error('moveImageRecord error:', error);
        resolve(false);
      }
    });
  }
  
  // ==================== GENERIC CRUD ====================
  
  async getAll(storeName) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result || []);
      } catch (error) {
        console.error('getAll error:', error);
        resolve([]);
      }
    });
  }
  
  async getById(storeName, id) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        const req = this.db.transaction(storeName, 'readonly').objectStore(storeName).get(id);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result || null);
      } catch (error) {
        console.error('getById error:', error);
        resolve(null);
      }
    });
  }
  
  async save(storeName, data, id = null) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        const store = this.db.transaction(storeName, 'readwrite').objectStore(storeName);
        const toSave = id ? { ...data, id } : data;
        const req = store.put(toSave);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(req.result);
      } catch (error) {
        console.error('save error:', error);
        reject(error);
      }
    });
  }
  
  async delete(storeName, id) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        const req = this.db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(true);
      } catch (error) {
        console.error('delete error:', error);
        resolve(false);
      }
    });
  }
  
  async clear(storeName) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        const req = this.db.transaction(storeName, 'readwrite').objectStore(storeName).clear();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve(true);
      } catch (error) {
        console.error('clear error:', error);
        resolve(false);
      }
    });
  }
  
  // ==================== SYNC QUEUE METHODS ====================
  
  async addToSyncQueue(tableName, action, data, originalId = null) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');
        
        const queueItem = {
          table_name: tableName,
          action: action,
          data: data,
          original_id: originalId,
          status: 'pending',
          retry_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const request = store.add(queueItem);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          console.log(`📝 Added to sync queue: ${action} on ${tableName}`);
          resolve(request.result);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async getPendingSync() {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction('syncQueue', 'readonly');
        const store = tx.objectStore('syncQueue');
        const index = store.index('status');
        const request = index.getAll('pending');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
      } catch (error) {
        resolve([]);
      }
    });
  }
  
  async markSyncComplete(id) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
      } catch (error) {
        resolve(false);
      }
    });
  }
  
  async markSyncFailed(id) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction('syncQueue', 'readwrite');
        const store = tx.objectStore('syncQueue');
        
        store.get(id).onsuccess = (event) => {
          const item = event.target.result;
          if (item) {
            item.retry_count = (item.retry_count || 0) + 1;
            item.updated_at = new Date().toISOString();
            
            if (item.retry_count >= 5) {
              item.status = 'failed';
            }
            
            store.put(item).onsuccess = () => resolve(true);
          } else {
            resolve(false);
          }
        };
      } catch (error) {
        resolve(false);
      }
    });
  }
  
  async addSyncLog(message, type = 'info', details = null) {
    if (!this.db) await this.initDB();
    return new Promise((resolve, reject) => {
      try {
        // Cek apakah store syncLog ada
        if (!this.db.objectStoreNames.contains('syncLog')) {
          console.warn('syncLog store not found');
          resolve(null);
          return;
        }
        
        const tx = this.db.transaction('syncLog', 'readwrite');
        const store = tx.objectStore('syncLog');
        
        const logItem = {
          message: message,
          type: type,
          details: details ? JSON.stringify(details) : null,
          created_at: new Date().toISOString()
        };
        
        const request = store.add(logItem);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      } catch (error) {
        console.error('addSyncLog error:', error);
        resolve(null);
      }
    });
  }

  // ==================== RESET / WIPE LOCAL DB ====================
  async resetDatabase() {
    // Close open connection then delete database
    return new Promise((resolve, reject) => {
      try {
        if (this.db) {
          try { this.db.close(); } catch (e) {}
          this.db = null;
        }

        const deleteReq = indexedDB.deleteDatabase(DB_NAME);
        deleteReq.onsuccess = () => {
          console.log('✅ IndexedDB deleted:', DB_NAME);
          // remove any local sync markers
          try { localStorage.removeItem('last_full_sync'); } catch (e) {}
          try { localStorage.removeItem('last_kelas_sync'); } catch (e) {}
          resolve(true);
        };
        deleteReq.onerror = (e) => {
          console.error('Failed to delete IndexedDB:', e);
          reject(e);
        };
        deleteReq.onblocked = () => {
          console.warn('Delete blocked. Close other tabs using the app and retry.');
          reject(new Error('Delete blocked'));
        };
      } catch (err) {
        console.error('resetDatabase error:', err);
        reject(err);
      }
    });
  }
}

// Inisialisasi global
window.localDB = new LocalDB();
console.log('📦 LocalDB module loaded');