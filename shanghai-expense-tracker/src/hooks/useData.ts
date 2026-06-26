import { useLiveQuery } from 'dexie-react-hooks'
import { db, readSettings, DEFAULT_RATE } from '../db'
import type { Expense } from '../types'

/** All expenses, newest first (by date then createdAt). Reactive. */
export function useExpenses(): Expense[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.expenses.toArray()
    return all.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1
      return a.createdAt < b.createdAt ? 1 : -1
    })
  }, [])
}

export function useExpense(id: number | null): Expense | undefined {
  return useLiveQuery(async () => {
    if (id == null) return undefined
    return db.expenses.get(id)
  }, [id])
}

/** Active exchange rate (CNY -> IDR). Reactive; falls back to default while loading. */
export function useRate(): number {
  const settings = useLiveQuery(() => readSettings(), [])
  return settings?.exchangeRate ?? DEFAULT_RATE
}

export function useSettings() {
  return useLiveQuery(() => readSettings(), [])
}
