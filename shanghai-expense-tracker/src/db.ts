import Dexie, { type Table } from 'dexie'
import type { Expense, Settings } from './types'

export const DEFAULT_RATE = 2650

class ExpenseDB extends Dexie {
  expenses!: Table<Expense, number>
  settings!: Table<Settings, number>

  constructor() {
    super('shanghai-expense-tracker')
    this.version(1).stores({
      // Indexed fields only. photoBlob/description are stored but not indexed.
      expenses: '++id, date, category, createdAt',
      settings: '++id',
    })
  }
}

export const db = new ExpenseDB()

export const SETTINGS_ID = 1

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  exchangeRate: DEFAULT_RATE,
  rateUpdatedAt: new Date(0).toISOString(),
}

/**
 * Read the settings row WITHOUT writing. Safe to call inside a read-only
 * transaction (e.g. useLiveQuery). Returns defaults if the row doesn't exist
 * yet — `ensureSettings()` persists the real row at startup.
 */
export async function readSettings(): Promise<Settings> {
  const s = await db.settings.get(SETTINGS_ID)
  return s ?? { ...DEFAULT_SETTINGS }
}

/** Create the default settings row once on app startup (write — never call inside useLiveQuery). */
export async function ensureSettings(): Promise<void> {
  const s = await db.settings.get(SETTINGS_ID)
  if (!s) {
    await db.settings.put({
      id: SETTINGS_ID,
      exchangeRate: DEFAULT_RATE,
      rateUpdatedAt: new Date().toISOString(),
    })
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await readSettings()
  await db.settings.put({ ...current, ...patch, id: SETTINGS_ID })
}
