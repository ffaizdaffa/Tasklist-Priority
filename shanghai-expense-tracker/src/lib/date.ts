/** Today's date as a yyyy-mm-dd string in local time. */
export function todayISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

const dayFormatter = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "Senin, 23 Juni 2026" from a yyyy-mm-dd string. */
export function formatLongDate(iso: string): string {
  // Parse as local date (avoid UTC shift from `new Date('yyyy-mm-dd')`).
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return dayFormatter.format(new Date(y, m - 1, d))
}

const shortFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
})

/** "23 Jun" from a yyyy-mm-dd string. */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return shortFormatter.format(new Date(y, m - 1, d))
}

const datetimeFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return datetimeFormatter.format(d)
}
