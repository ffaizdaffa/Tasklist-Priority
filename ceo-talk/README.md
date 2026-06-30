# ☕ CEO Talk

Web app buat ngatur sesi ngobrol santai karyawan bareng CEO sambil ngopi/makan.
Dua layar yang sync **real-time** via Supabase:

- **`/submit`** — layar HP karyawan: submit nama, lihat counter slot live.
- **`/tv`** — layar TV: daftar peserta + **spin wheel** buat ngacak jadwal.

## Stack

Vite + React + TypeScript · Supabase (Postgres + Realtime) · Tailwind CSS ·
Framer Motion · React Router.

## Konsep

24 peserta, 24 slot hari kerja (Sen–Jum) dari **30 Jun 2026** s/d **31 Jul 2026**
(1 sesi per hari). Tiap kali tombol **SPIN** dipencet di TV, 1 nama acak kepilih
dan otomatis di-assign ke tanggal kosong paling awal. Submit di HP langsung
nongol di TV tanpa refresh.

---

## 1. Setup Supabase

1. Bikin project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** → paste isi
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) →
   **Run**.
   Ini bikin table `participants` & `schedule`, RPC `join_ceo_talk` (cap 24 anti
   race condition), RLS policy, dan ngaktifin Realtime di kedua table.

   > Pakai Supabase CLI? Cukup `supabase db push` dari folder ini.

3. Ambil kredensial di **Settings → API**:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

## 2. Konfigurasi env

```bash
cp .env.example .env
# isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
```

## 3. Jalanin

```bash
npm install
npm run dev
```

Vite jalan dengan `host: true`, jadi keluar 2 URL: `localhost` dan alamat LAN
(misal `http://192.168.x.x:5173`).

- Di **TV / laptop**: buka `http://localhost:5173/tv`
- Di **HP** (samain WiFi-nya): buka `http://192.168.x.x:5173/submit`

Submit nama di HP → langsung muncul di TV. Pencet **SPIN** di TV buat ngacak
jadwal.

## Konstanta (gampang diubah)

Edit [`src/config.ts`](src/config.ts):

| Konstanta          | Nilai        | Keterangan                         |
| ------------------ | ------------ | ---------------------------------- |
| `MAX_PARTICIPANTS` | `24`         | kapasitas peserta                  |
| `SLOTS_PER_DAY`    | `1`          | sesi per hari                      |
| `START_DATE`       | `2026-06-30` | mulai (Selasa)                     |
| `END_DATE`         | `2026-07-31` | selesai (Jumat)                    |

Hari valid otomatis cuma Senin–Jumat. Kalau jumlah hari kerja ≠
`MAX_PARTICIPANTS`, app nge-log warning di console.

> ⚠️ Kalau `MAX_PARTICIPANTS` diubah, update juga angka cap (`24`) di function
> `join_ceo_talk` pada SQL migration — cap di-enforce di server.

## Struktur folder

```
ceo-talk/
├─ .env.example
├─ index.html
├─ supabase/migrations/0001_init.sql   # schema + realtime + RPC
└─ src/
   ├─ config.ts                        # konstanta
   ├─ types.ts
   ├─ lib/
   │  ├─ supabase.ts                   # client
   │  └─ dates.ts                      # generate hari kerja + format ID
   ├─ hooks/useCeoTalkData.ts          # fetch + realtime subscription
   ├─ components/SpinWheel.tsx         # wheel SVG + animasi
   ├─ pages/Submit.tsx                 # /submit (HP)
   └─ pages/TV.tsx                     # /tv (layar gede)
```

## Catatan teknis

- **Cap 24 anti race condition**: RPC `join_ceo_talk` ngunci tabel + cek count
  dalam 1 transaksi, plus constraint `position` unik & range 1–24.
- **Anti dobel jadwal**: constraint unik di `talk_date` & `participant_id`;
  kalau ada bentrok pas assign, TV otomatis lompat ke tanggal kosong berikutnya.
- **Anti spam 1 device**: status join disimpen di `localStorage`.
- **Nama duplikat**: cuma dikasih warning, gak nge-block.
