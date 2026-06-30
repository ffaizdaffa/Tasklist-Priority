/**
 * Konstanta CEO Talk — gampang diubah di satu tempat.
 *
 * PENTING: kalau lo ganti MAX_PARTICIPANTS, update juga angka cap (24)
 * di SQL function `join_ceo_talk` pada migration Supabase, karena cap
 * di-enforce di server biar aman dari race condition.
 */
export const CONFIG = {
  MAX_PARTICIPANTS: 24,
  SLOTS_PER_DAY: 1,
  START_DATE: '2026-06-30', // Selasa
  END_DATE: '2026-07-31', // Jumat
} as const;
