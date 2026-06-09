# Kitab Madin Desktop — Aplikasi POS Kitabuna Al-Muktamar

Aplikasi Point of Sale (POS) untuk toko kitab Madin Almuktamar, berbasis **offline-first** dengan sinkronisasi ke Supabase saat online.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Vanilla JS + Vite 8 |
| Desktop | Tauri 2 (Rust) |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Hosting | Vercel (web) |
| Charts | Chart.js 4 |
| PDF | jsPDF + jspdf-autotable |
| UI | SweetAlert2, Font Awesome, CSS custom |

## Menjalankan Proyek

```bash
# Install dependencies
npm install

# Development server (web, port 1420)
npm run dev

# Build untuk production
npm run build

# Deploy ke Vercel
vercel --prod --yes

# Development desktop (Tauri)
npm run desktop

# Build desktop
npm run desktop:build
```

## Struktur Halaman

| URL | File | Fungsi |
|-----|------|--------|
| `/` | `index.html` | Halaman login |
| `/app.html` | `app.html` | Aplikasi utama setelah login |

## Modul JavaScript

| File | Baris | Fungsi |
|------|-------|--------|
| `app-offline.js` | ~2780 | **Core app**: Dashboard, Produk, Kasir, Laporan, PDF Export, WhatsApp Share, Nota |
| `auth.js` | ~637 | Autentikasi Supabase, role-based routing, device detection |
| `auth-offline.js` | ~210 | Fallback auth untuk mode offline |
| `offline-core.js` | ~1376 | CRUD offline (IndexedDB), transaksi, produk, profil |
| `db-local.js` | ~503 | Wrapper IndexedDB (Dexie), schema & migrasi |
| `sync-manager.js` | ~601 | Sinkronisasi data offline ↔ Supabase |
| `sync-notification.js` | ~513 | Notifikasi & UI sync status |
| `master-kelas.js` | ~376 | CRUD Master Kelas (produk_kelas), admin only |
| `admin-devices.js` | ~168 | Manajemen perangkat offline (admin) |
| `supabase.js` | ~16 | Inisialisasi Supabase client |
| `device.js` | ~8 | Helper device detection |
| `umm-alqura.js` | ~117 | Kalender Hijriah (Umm al-Qura) |

## File SQL

| File | Fungsi |
|------|--------|
| `scripts/create-profile-trigger.sql` | Trigger auto-create profile saat user baru daftar |
| `scripts/update-offline-devices-columns.sql` | Update kolom tabel offline_devices |
| `scripts/clean-tauri.ps1` | Cleanup Tauri build artifacts |

## Dual File Structure

**PENTING**: Proyek ini punya struktur dual — setiap file JS ada di 2 tempat:
- `src/js/*.js` — source utama (untuk development/editing)
- `src/public/js/*.js` — copy untuk Vite publicDir (harus IDENTIK dengan src/js/)

Begitu juga HTML:
- `src/app.html` dan `src/public/app.html`
- `src/index.html` dan `src/public/index.html`

**Setiap perubahan di `src/js/` WAJIB juga diterapkan ke `src/public/js/`**, dan sebaliknya.

## Supabase Tables

| Tabel | Fungsi |
|-------|--------|
| `auth.users` | User authentication (email/password + Google OAuth) |
| `profiles` | Profile user (id, nama, role: admin/kasir) |
| `produk` | Master produk (nama, harga_beli, harga_jual, stok) |
| `transaksi` | Header transaksi penjualan |
| `detail_transaksi` | Detail item per transaksi |
| `produk_kelas` | Relasi produk ke kelas (Master Kelas) |
| `offline_devices` | Perangkat yang diizinkan mode offline |

## URL Produksi

- **Web**: https://kitab-madin.vercel.app
- **Supabase**: https://jtqraahesthkgthbcktp.supabase.co
