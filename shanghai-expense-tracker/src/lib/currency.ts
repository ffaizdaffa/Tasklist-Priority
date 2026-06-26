/** Convert CNY amount to IDR using the active rate. Returns rounded integer rupiah. */
export function cnyToIdr(amountCNY: number, rate: number): number {
  if (!isFinite(amountCNY) || !isFinite(rate)) return 0
  return Math.round(amountCNY * rate)
}

const idrFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
})

/** Rp 1.500.000 */
export function formatIDR(amount: number): string {
  return 'Rp ' + idrFormatter.format(Math.round(amount || 0))
}

const cnyFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** ¥123,45 */
export function formatCNY(amount: number): string {
  return '¥' + cnyFormatter.format(amount || 0)
}
