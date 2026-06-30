import { CONFIG } from '../config';

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/** Parse 'YYYY-MM-DD' jadi Date lokal (tanpa geser timezone). */
function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format Date jadi 'YYYY-MM-DD' dari komponen lokal. */
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Generate array tanggal kerja (Senin–Jumat) dari start sampai end (inklusif).
 * Sabtu & Minggu di-skip.
 */
export function generateWorkingDays(startISO: string, endISO: string): string[] {
  const dates: string[] = [];
  const cur = parseISO(startISO);
  const last = parseISO(endISO);

  while (cur.getTime() <= last.getTime()) {
    const dow = cur.getDay(); // 0=Min ... 6=Sab
    if (dow >= 1 && dow <= 5) {
      dates.push(toISO(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/** Format tanggal ke Indonesia, contoh: 'Sel, 30 Jun'. */
export function formatDateID(iso: string): string {
  const d = parseISO(iso);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/** Semua slot tanggal kerja dalam window CEO Talk. */
export const WORKING_DAYS = generateWorkingDays(CONFIG.START_DATE, CONFIG.END_DATE);

// Validasi: jumlah hari kerja harus pas sama kapasitas peserta.
if (WORKING_DAYS.length !== CONFIG.MAX_PARTICIPANTS) {
  console.warn(
    `[CEO Talk] Jumlah hari kerja (${WORKING_DAYS.length}) ` +
      `TIDAK sama dengan MAX_PARTICIPANTS (${CONFIG.MAX_PARTICIPANTS}). ` +
      `Cek START_DATE / END_DATE di config.`
  );
}

/**
 * Cari tanggal kosong paling awal yang belum dipakai.
 * `usedDates` = daftar talk_date yang udah ke-assign.
 */
export function earliestFreeDate(usedDates: string[]): string | null {
  const used = new Set(usedDates);
  for (const d of WORKING_DAYS) {
    if (!used.has(d)) return d;
  }
  return null;
}
