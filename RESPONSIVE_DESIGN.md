# Responsive Design - Tampilan Robust di Semua Device

## Overview
Aplikasi Kitab Madin telah dioptimalkan dengan CSS responsif yang robust untuk semua ukuran device.

## Breakpoints

### Desktop (1200px ke atas)
- Layout 2-3 kolom untuk chart dan tabel
- 5 kolom untuk grid produk
- Padding normal dan font size standar

### Tablet Landscape & Hybrid (900px - 1199px)
- Layout 2 kolom untuk chart
- 4 kolom untuk grid produk
- Ukuran font sedikit berkurang

### Tablet Portrait (600px - 899px)
- Layout 1 kolom (bertingkat)
- 3 kolom untuk grid produk
- Tabel dengan max-height 400px dan horizontal scroll

### Mobile Landscape (481px - 599px)
- Layout 1 kolom penuh (bertingkat)
- 2 kolom untuk grid produk
- Tabel dengan max-height 350px dan horizontal scroll

### Mobile Portrait (320px - 480px)
- Layout 1 kolom penuh (bertingkat)
- 2x1 grid khusus untuk produk
- Tabel dengan max-height 300px dan horizontal scroll

## Fitur Responsif

### 1. Horizontal Scroll untuk Tabel
```css
.table-responsive,
.h-prob,
.table-responsive-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;  /* Smooth scroll mobile */
}
```

### 2. Layout Bertingkat (Stacked)
Di mobile, semua elemen ditampilkan dalam 1 kolom secara vertikal:
- Chart ditampilkan full-width
- Tabel di bawah chart dengan scroll horizontal
- Grid produk 2 kolom kompak

### 3. Tipografi Responsif
- Desktop: 0.9rem - 1.8rem
- Tablet: 0.8rem - 1.5rem
- Mobile: 0.65rem - 1.1rem

### 4. Chart Responsive
- Desktop: height 300px
- Tablet: height 250px
- Mobile: height 180px-200px

## Penggunaan

### Class CSS yang Sudah Ada
Semua class sudah responsive secara otomatis:
- `.table-responsive` - Tabel dengan scroll
- `.h-prob` - Container responsif
- `.charts-grid` - Grid chart 2 kolom (stacked di mobile)
- `.summary-cards` - Summary cards responsif
- `.produk-grid` - Grid produk responsif

### Implementasi di HTML
Tidak perlu JavaScript tambahan, cukup gunakan class CSS:

```html
<!-- Tabel dengan horizontal scroll -->
<div class="table-responsive">
  <table class="modern-table">
    ...
  </table>
</div>

<!-- Chart container -->
<div class="chart-wrapper">
  <h3>📊 Grafik</h3>
  <canvas id="myChart"></canvas>
</div>

<!-- Layout bertingkat -->
<div class="charts-grid">
  <div class="chart-wrapper">...</div>
  <div class="chart-wrapper">...</div>
</div>
```

## Hasil
- ✅ Responsif 100% di semua device
- ✅ Horizontal scroll otomatis untuk tabel saat dikecilkan
- ✅ Layout bertingkat (stacked) yang rapi di mobile
- ✅ Performa optimal dengan pure CSS (no JavaScript overhead)
- ✅ Touch-friendly di semua device
