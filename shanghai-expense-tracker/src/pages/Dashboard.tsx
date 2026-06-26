import { useExpenses, useRate } from '../hooks/useData'
import { cnyToIdr, formatCNY, formatIDR } from '../lib/currency'
import { formatShortDate } from '../lib/date'
import { CATEGORY_STYLES, type Category } from '../types'

export function Dashboard() {
  const expenses = useExpenses()
  const rate = useRate()

  if (!expenses) return <Loading />

  const totalCNY = expenses.reduce((s, e) => s + e.amountCNY, 0)
  const totalIDR = cnyToIdr(totalCNY, rate)
  const txCount = expenses.length

  // Per-category aggregation
  const byCategory = new Map<Category, number>()
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountCNY)
  }
  const categoryRows = [...byCategory.entries()].sort((a, b) => b[1] - a[1])

  // Per-day aggregation
  const byDay = new Map<string, number>()
  for (const e of expenses) {
    byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amountCNY)
  }
  const dayRows = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  const dayCount = byDay.size
  const avgPerDayCNY = dayCount > 0 ? totalCNY / dayCount : 0
  const maxDay = Math.max(1, ...dayRows.map(([, v]) => v))

  return (
    <div className="mx-auto max-w-md">
      <Header title="Rekap" subtitle="Shanghai Trip" />

      <div className="space-y-4 px-4 pb-28">
        {/* Total card */}
        <div className="rounded-3xl bg-gradient-to-br from-brand to-rose-600 p-6 text-white shadow-lg shadow-brand/20">
          <p className="text-sm font-medium text-white/80">Total Pengeluaran</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{formatIDR(totalIDR)}</p>
          <p className="mt-1 text-lg font-semibold text-white/90">{formatCNY(totalCNY)}</p>
          <div className="mt-4 flex gap-6 border-t border-white/20 pt-3 text-sm">
            <div>
              <p className="text-white/70">Transaksi</p>
              <p className="text-base font-semibold">{txCount}</p>
            </div>
            <div>
              <p className="text-white/70">Hari aktif</p>
              <p className="text-base font-semibold">{dayCount}</p>
            </div>
            <div>
              <p className="text-white/70">Rata-rata / hari</p>
              <p className="text-base font-semibold">{formatIDR(cnyToIdr(avgPerDayCNY, rate))}</p>
            </div>
          </div>
        </div>

        {txCount === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-400">
            <p className="text-sm">Belum ada pengeluaran.</p>
            <p className="mt-1 text-xs">Tap tombol + untuk menambah.</p>
          </div>
        )}

        {/* Category breakdown */}
        {categoryRows.length > 0 && (
          <Card title="Per Kategori">
            <div className="space-y-3">
              {categoryRows.map(([cat, cny]) => {
                const pct = totalCNY > 0 ? (cny / totalCNY) * 100 : 0
                const style = CATEGORY_STYLES[cat]
                return (
                  <div key={cat}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className={'h-2.5 w-2.5 rounded-full ' + style.dot} />
                        {cat}
                      </span>
                      <span className="text-slate-500">
                        {formatIDR(cnyToIdr(cny, rate))}{' '}
                        <span className="text-xs text-slate-400">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={'h-full rounded-full ' + style.bar}
                        style={{ width: pct + '%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Per-day breakdown */}
        {dayRows.length > 0 && (
          <Card title="Per Hari">
            <div className="space-y-3">
              {dayRows.map(([day, cny]) => {
                const pct = (cny / maxDay) * 100
                return (
                  <div key={day}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{formatShortDate(day)}</span>
                      <span className="text-slate-500">
                        {formatIDR(cnyToIdr(cny, rate))}{' '}
                        <span className="text-xs text-slate-400">{formatCNY(cny)}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: pct + '%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header
      className="px-4 pb-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      {subtitle && <p className="text-sm font-medium text-brand">{subtitle}</p>}
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
    </header>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center pt-32 text-slate-400">Memuat…</div>
  )
}
