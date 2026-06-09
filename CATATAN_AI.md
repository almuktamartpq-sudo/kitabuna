# CATATAN AI — Panduan untuk Sesi Baru

Dokumen ini ditujukan untuk AI assistant yang baru bergabung ke proyek ini. Baca file ini terlebih dahulu sebelum melakukan perubahan apapun.

---

## Bahasa Respons

Selalu jawab dalam **Bahasa Indonesia**, kecuali istilah teknis yang tidak punya padanan umum.

## Aturan #1: Dual File Sync

**WAJIB**: Setiap perubahan di `src/js/` harus juga diterapkan ke `src/public/js/` (dan sebaliknya). Begitu juga `src/*.html` ↔ `src/public/*.html`.

Alasan: Vite menggunakan `publicDir: 'public'` yang menyalin static files ke dist/. Source yang diedit adalah di `src/js/`, tapi yang di-serve saat build adalah dari `src/public/js/`.

## Build & Deploy Workflow

```bash
# Setelah semua perubahan selesai:
npm run build          # Build dengan Vite
vercel --prod --yes    # Deploy ke production

# JANGAN lupa deploy setelah perubahan signifikan
```

## Helper Function Penting

```javascript
// Format angka ribuan Indonesia (tanpa Rp)
function fmtAngka(n) {
  return Number(n || 0).toLocaleString('id-ID');
}
```

Gunakan `fmtAngka()` untuk semua angka di tabel dan share text. Untuk area yang butuh prefix "Rp", gunakan string concatenation manual: `'Rp ' + Number(n).toLocaleString()`.

## Aturan Format "Rp"

| Area | Format |
|------|--------|
| Chart axis labels | `Rp 15.000` |
| Kasir product card | `Rp 15.000` |
| Kasir cart (total, kembalian) | `Rp 15.000` |
| Kasir dialog (konfirmasi/sukses) | `Rp 15.000` |
| Summary cards (stats) | `Rp 15.000` |
| Tabel aplikasi | `15.000` (tanpa Rp) |
| Tabel PDF | `15.000` (tanpa Rp) |
| Nota print | `15.000` (tanpa Rp) |
| WhatsApp share | `15.000` (tanpa Rp) |

## Page Title Pattern

Semua page title di-set via `innerHTML` dengan icon Font Awesome yang **sama dengan icon di sidebar menu**:

```javascript
document.getElementById("pageTitle").innerHTML = '<i class="fas fa-chart-pie"></i> Dashboard';
document.getElementById("pageTitle").innerHTML = '<i class="fas fa-box"></i> Manajemen Produk';
document.getElementById("pageTitle").innerHTML = '<i class="fas fa-shopping-cart"></i> Kasir';
```

## File Utama yang Sering Diedit

1. **`src/js/app-offline.js`** (~2780 baris) — file terbesar, berisi hampir semua fitur
2. **`src/app.html`** (~3321 baris) — HTML utama dengan semua modal dan layout
3. **`src/css/style.css`** — styling custom
4. **`src/js/master-kelas.js`** — fitur Master Kelas
5. **`src/js/auth.js`** — authentication dan routing

## Supabase Connection

```javascript
const SUPABASE_URL = "https://jtqraahesthkgthbcktp.supabase.co";
const SUPABASE_KEY = "eyJhbGci..."; // anon key
window.sb = createClient(SUPABASE_URL, SUPABASE_KEY, { ... });
```

## Known Pitfalls

1. **PowerShell tidak support `&&`** — gunakan `;` sebagai separator
2. **Vite 8+ rollupOptions.input** — path harus relative terhadap `root: 'src'`
3. **Script tanpa `type="module"`** tidak di-bundle Vite, hanya di-copy sebagai static
4. **Intl.DateTimeFormat Islamic calendar** tidak konsisten lintas platform — gunakan `umm-alqura.js` sebagai fallback
5. **Guard `objectStoreNames.contains()`** sebelum `createObjectStore` di IndexedDB
6. **HTML meta tag harus self-closing** (`/>` bukan `>`)
7. **Tauri build** butuh Windows SDK + MSVC linker + RC.EXE
8. **Vercel upload bisa gagal** kalau `node_modules` terlalu besar — gunakan `.vercelignore`

## Profil User di Database

User yang login via Google **belum otomatis** punya row di tabel `profiles`. Trigger `handle_new_user()` di `scripts/create-profile-trigger.sql` perlu dijalankan di Supabase SQL Editor.

Untuk backfill user lama:
```sql
INSERT INTO public.profiles (id, nama, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 'kasir'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

## Fitur yang Sudah Selesai (Status Terkini)

- [x] Format "Rp" sesuai konteks (kasir/chart=ada, tabel=tidak)
- [x] WhatsApp share text format plain (tanpa emoji/dekorasi)
- [x] Mobile branding "Kitabuna"
- [x] Semua page title punya icon Font Awesome
- [x] Kalender Hijriah (Umm al-Qura)
- [x] Offline-first dengan IndexedDB + sync
- [x] Role-based access (admin/kasir)
- [x] PDF export (Laporan Penjualan + Master Data)
- [x] Nota digital dengan print & share WhatsApp
- [x] PWA dengan auto-update service worker
- [x] Responsive design (desktop + mobile)
- [x] Deploy ke Vercel (production)

## URL Penting

| Resource | URL |
|----------|-----|
| Production | https://kitab-madin.vercel.app |
| Supabase Dashboard | https://supabase.com/dashboard |
| Vercel Dashboard | https://vercel.com/almuktamar-s-projects |

---

*File ini terakhir diperbarui: Juni 2026*
