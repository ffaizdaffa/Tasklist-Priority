export const CATEGORIES = [
  'Makanan',
  'Transport',
  'Belanja',
  'Hotel',
  'Tiket/Atraksi',
  'Lain-lain',
] as const

export type Category = (typeof CATEGORIES)[number]

export interface Expense {
  id?: number
  date: string // ISO date (yyyy-mm-dd)
  description: string
  category: Category
  amountCNY: number
  photoBlob?: Blob
  createdAt: string // ISO datetime
}

export interface Settings {
  id?: number
  exchangeRate: number // CNY -> IDR
  rateUpdatedAt: string // ISO datetime
}

// Tailwind classes per category badge.
export const CATEGORY_STYLES: Record<Category, { badge: string; dot: string; bar: string }> = {
  Makanan: { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  Transport: { badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500', bar: 'bg-sky-500' },
  Belanja: { badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  Hotel: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  'Tiket/Atraksi': { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  'Lain-lain': { badge: 'bg-slate-200 text-slate-700', dot: 'bg-slate-500', bar: 'bg-slate-500' },
}
