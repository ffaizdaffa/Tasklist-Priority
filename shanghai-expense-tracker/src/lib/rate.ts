/**
 * Fetch the live CNY -> IDR rate from open.er-api.com (free, no API key).
 * Returns the rate number or throws on failure / offline.
 */
export async function fetchLiveRate(): Promise<number> {
  const res = await fetch('https://open.er-api.com/v6/latest/CNY', {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Gagal mengambil kurs (HTTP ' + res.status + ')')
  const data = await res.json()
  const idr = data?.rates?.IDR
  if (typeof idr !== 'number' || !isFinite(idr) || idr <= 0) {
    throw new Error('Respons kurs tidak valid')
  }
  return idr
}
