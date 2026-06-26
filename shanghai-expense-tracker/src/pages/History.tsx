import { useExpenses, useRate } from '../hooks/useData'
import { cnyToIdr, formatCNY, formatIDR } from '../lib/currency'
import { formatLongDate } from '../lib/date'
import { CATEGORY_STYLES, type Expense } from '../types'
import { PhotoImg } from '../components/PhotoImg'

interface Props {
  onSelect: (id: number) => void
}

export function History({ onSelect }: Props) {
  const expenses = useExpenses()
  const rate = useRate()

  if (!expenses) {
    return <div className="pt-32 text-center text-slate-400">Memuat…</div>
  }

  // Group by date (expenses already sorted newest-first).
  const groups: { date: string; items: Expense[] }[] = []
  for (const e of expenses) {
    const last = groups[groups.length - 1]
    if (last && last.date === e.date) last.items.push(e)
    else groups.push({ date: e.date, items: [e] })
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="px-4 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <h1 className="text-2xl font-bold text-slate-900">Riwayat</h1>
      </header>

      <div className="space-y-5 px-4 pb-28">
        {groups.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-400">
            <p className="text-sm">Belum ada pengeluaran.</p>
          </div>
        )}

        {groups.map((g) => {
          const subtotalCNY = g.items.reduce((s, e) => s + e.amountCNY, 0)
          return (
            <section key={g.date}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-slate-900">{formatLongDate(g.date)}</h2>
                <span className="text-xs font-medium text-slate-500">
                  {formatIDR(cnyToIdr(subtotalCNY, rate))}
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {g.items.map((e, i) => (
                  <button
                    key={e.id}
                    onClick={() => e.id != null && onSelect(e.id)}
                    className={
                      'flex w-full items-center gap-3 px-3 py-3 text-left active:bg-slate-50 ' +
                      (i > 0 ? 'border-t border-slate-100' : '')
                    }
                  >
                    <PhotoImg
                      blob={e.photoBlob}
                      className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                      fallbackClassName="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {e.description || <span className="text-slate-400">Tanpa keterangan</span>}
                      </p>
                      <span
                        className={
                          'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
                          CATEGORY_STYLES[e.category].badge
                        }
                      >
                        {e.category}
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatIDR(cnyToIdr(e.amountCNY, rate))}
                      </p>
                      <p className="text-xs text-slate-400">{formatCNY(e.amountCNY)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
