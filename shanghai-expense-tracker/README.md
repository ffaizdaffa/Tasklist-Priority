# Shanghai Expense Tracker 🇨🇳💴

Webapp mobile-first (dioptimalkan untuk iPhone / Safari) buat nyatat pengeluaran
selama trip di Shanghai. Foto struk, isi nominal CNY, langsung dikonversi ke IDR,
plus rekap total & breakdown. **100% client-side**, tanpa backend, bisa offline,
dan bisa di-_install_ ke home screen (PWA).

## Fitur

- **Tambah pengeluaran** — foto dari kamera/galeri (auto-compress ke max 1080px),
  tanggal (auto dari EXIF foto kalau ada), keterangan, kategori, nominal CNY
  dengan **live preview IDR**.
- **Riwayat** — dikelompokkan per tanggal dengan subtotal harian; tap item untuk
  lihat foto penuh, edit, atau hapus.
- **Rekap / Dashboard** — total CNY & IDR, breakdown per kategori (+ persen & bar),
  breakdown per hari, rata-rata per hari, jumlah transaksi.
- **Settings — Kurs** — edit kurs manual (default `2650`) atau ambil kurs live dari
  [open.er-api.com](https://open.er-api.com) (gratis, tanpa API key). Offline tetap
  pakai kurs terakhir.
- **Export CSV** — semua data (tanggal, keterangan, kategori, CNY, IDR).

> Catatan: nominal IDR **tidak** disimpan — selalu dihitung on-the-fly dari
> `amountCNY × kurs aktif`, jadi mengubah kurs langsung memperbarui semua angka.

## Tech stack

React + Vite + TypeScript · Tailwind CSS · **Dexie.js (IndexedDB)** untuk data &
foto (Blob) · **vite-plugin-pwa** (Workbox) untuk offline + install.

## Run lokal

```bash
cd shanghai-expense-tracker
npm install
npm run dev
```

Buka URL yang muncul (default `http://localhost:5173`). Untuk mencoba di iPhone di
jaringan yang sama:

```bash
npm run dev -- --host
```

lalu buka alamat `Network:` dari HP. (PWA/service worker hanya aktif penuh di
build produksi atau via HTTPS — lihat di bawah.)

### Build & preview produksi

```bash
npm run build      # type-check + build ke dist/
npm run preview    # serve hasil build secara lokal
```

### Regenerate ikon PWA (opsional)

Ikon di-`public/` dibuat oleh skrip tanpa dependensi:

```bash
npm run icons
```

## Deploy ke Vercel

Project ini ada di subfolder `shanghai-expense-tracker/` dalam repo. Dua cara:

### A. Lewat dashboard Vercel (paling gampang)

1. Push repo ini ke GitHub (sudah).
2. Di [vercel.com](https://vercel.com) → **Add New… → Project** → import repo
   `tasklist-priority`.
3. **Root Directory**: klik _Edit_ dan pilih **`shanghai-expense-tracker`**.
4. Framework Preset otomatis terdeteksi **Vite**. Biarkan default:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Deploy**. Selesai — dapat URL `https://<nama>.vercel.app`.

### B. Lewat Vercel CLI

```bash
npm i -g vercel
cd shanghai-expense-tracker
vercel            # ikuti prompt, deploy preview
vercel --prod     # deploy production
```

## Install ke Home Screen iPhone

1. Buka URL produksi (HTTPS, mis. domain Vercel) di **Safari**.
2. Tap tombol **Share** → **Add to Home Screen** → **Add**.
3. Buka dari ikon di home screen — jalan full-screen & offline. Data tersimpan di
   IndexedDB perangkat dan persist setelah app ditutup/reload.
