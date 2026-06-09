# PROJECT CONTEXT — Kitab Madin Desktop

Dokumen ini berisi konteks arsitektur, keputusan desain, dan pola penting dalam proyek.

---

## Arsitektur Umum

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND (Vite)                  │
│  index.html (Login) → app.html (Main App)        │
│  Vanilla JS, Chart.js, jsPDF, SweetAlert2        │
├─────────────────────────────────────────────────┤
│              OFFLINE LAYER (IndexedDB)            │
│  db-local.js → offline-core.js → sync-manager    │
│  Dexie.js wrapper, CRUD offline, compare & sync  │
├─────────────────────────────────────────────────┤
│              BACKEND (Supabase)                   │
│  PostgreSQL + Auth (email/Google) + RLS + Storage │
├─────────────────────────────────────────────────┤
│              DESKTOP (Tauri 2)                    │
│  Rust backend, Windows build, auto-updater       │
└─────────────────────────────────────────────────┘
```

## Role-Based Access

| Fitur | Admin | Kasir |
|-------|-------|-------|
| Dashboard | Ya | Ya |
| Manajemen Produk | Ya | Tidak |
| Kasir (POS) | Ya | Ya |
| Laporan Penjualan | Ya | Ya |
| Laporan Master Data | Ya | Tidak |
| Master Kelas | Ya | Tidak |
| Kelola Perangkat Offline | Ya | Tidak |

## Alur Kasir (POS)

1. User buka halaman Kasir
2. Produk ditampilkan sebagai card (Shopee-style mobile UI)
3. Klik produk → tambah ke keranjang
4. Input nama pembeli (opsional)
5. Klik "Bayar" → modal pembayaran → hitung kembalian
6. Konfirmasi → transaksi tersimpan (offline + online)
7. Nota tampil → bisa Print atau Share WhatsApp

## Alur WhatsApp Share

- Share text disiapkan saat nota modal dibuat (`preparedNotaTexts`)
- Format: plain text sederhana tanpa emoji/dekorasi berlebih
- Template:
```
KITABUNA AL-MUKTAMAR
NOTA PENJUALAN
--------------------------------
No : #xxxxxxxx
Tgl: ...
Pembeli: ...
--------------------------------
[Nama Produk]
[qty] x [harga] = [subtotal]
--------------------------------
TOTAL : [total]
--------------------------------
Kasir : [nama kasir]
Terima kasih.
CS: 0858-5160-0898
```

## Format Tampilan Angka

### Dengan prefix "Rp":
- Chart axis labels (semua 3 chart)
- Kasir: product card harga, cart item harga, total bayar, kembalian, dialog konfirmasi/sukses
- Summary cards: Laporan Penjualan (Omzet/Laba/Rata-rata) & Laporan Master Data (Modal/Jual/Laba)

### Tanpa prefix "Rp" (hanya angka + titik ribuan):
- Semua tabel aplikasi (transaksi, detail, produk)
- Semua tabel PDF export
- WhatsApp share text
- Nota print

**Helper function**: `fmtAngka(n)` → `Number(n || 0).toLocaleString('id-ID')`

## Page Title Icons

Semua page title menggunakan `innerHTML` dengan Font Awesome icon yang sesuai menu sidebar:

| Halaman | Icon | Code |
|---------|------|------|
| Dashboard | `fa-chart-pie` | `<i class="fas fa-chart-pie"></i> Dashboard` |
| Produk | `fa-box` | `<i class="fas fa-box"></i> Manajemen Produk` |
| Kasir | `fa-shopping-cart` | `<i class="fas fa-shopping-cart"></i> Kasir` |
| Laporan Penjualan | `fa-chart-line` | `<i class="fas fa-chart-line"></i> Laporan Penjualan` |
| Laporan Master Data | `fa-database` | `<i class="fas fa-database"></i> Laporan Master Data` |
| Master Kelas | `fa-graduation-cap` | `<i class="fas fa-graduation-cap"></i> Master Kelas` |

## Tanggal Hijriah

- Menggunakan kalkulasi Umm al-Qura (`umm-alqura.js`)
- Ditampilkan di header aplikasi dan dashboard
- Fallback ke `Intl.DateTimeFormat` dengan `calendar: 'islamic-umalqura'`
- Format: `{day} {month} {year} H`

## Mobile Branding

- Mobile header: **"Kitabuna"** (bukan "Kitab Madin")
- Sidebar logo: gambar + teks "Kitabuna"

## Vite Build Configuration

```javascript
{
  root: 'src',           // Source files di src/
  publicDir: 'public',   // Static assets di src/public/
  build: {
    outDir: '../dist',   // Output ke dist/ (root level)
    rollupOptions: {
      input: { main: 'index.html', app: 'app.html' }
    }
  }
}
```

**Catatan**: Script external (`<script src="js/...">`) tidak di-bundle oleh Vite karena tidak punya `type="module"`. File JS disalin dari `src/public/js/` ke `dist/js/` sebagai static assets.

## Deployment

```bash
# Build + Deploy ke Vercel
npm run build
vercel --prod --yes
```

- Project alias: `kitab-madin.vercel.app`
- Vercel project: `kitab-madin-desktop`
- Owner: `almuktamar-s-projects`

## Supabase RLS Policies

Tabel `profiles` harus punya RLS yang mengizinkan:
- User bisa baca profile sendiri
- Admin bisa baca semua profiles
- Trigger `handle_new_user()` auto-insert ke profiles saat user baru daftar

## Offline Sync Flow

```
Online Mode:
  App → Supabase (langsung)

Offline Mode:
  App → IndexedDB (lokal)
  Saat online kembali → SyncManager.compareData() → upload/download
```

Hanya perangkat yang terdaftar di `offline_devices` yang bisa menggunakan mode offline (admin yang mengotorisasi).
