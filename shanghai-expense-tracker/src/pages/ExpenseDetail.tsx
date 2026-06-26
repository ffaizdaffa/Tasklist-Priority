import { useState } from 'react'
import { db } from '../db'
import { useExpense, useRate } from '../hooks/useData'
import { cnyToIdr, formatCNY, formatIDR } from '../lib/currency'
import { formatLongDate } from '../lib/date'
import { CATEGORY_STYLES } from '../types'
import { PhotoImg } from '../components/PhotoImg'

interface Props {
  id: number
  onBack: () => void
  onEdit: (id: number) => void
}

export function ExpenseDetail({ id, onBack, onEdit }: Props) {
  const expense = useExpense(id)
  const rate = useRate()
  const [confirming, setConfirming] = useState(false)

  if (expense === undefined) {
    return <div className="pt-32 text-center text-slate-400">Memuat…</div>
  }
  if (expense === null || !expense) {
    return (
      <div className="pt-32 text-center text-slate-400">
        <p>Data tidak ditemukan.</p>
        <button onClick={onBack} className="mt-3 text-brand">
          Kembali
        </button>
      </div>
    )
  }

  async function handleDelete() {
    await db.expenses.delete(id)
    onBack()
  }

  const style = CATEGORY_STYLES[expense.category]

  return (
    <div className="mx-auto max-w-md">
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium text-slate-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Kembali
        </button>
        <button onClick={() => onEdit(id)} className="text-sm font-semibold text-brand">
          Edit
        </button>
      </header>

      <div className="space-y-4 p-4 pb-28">
        {expense.photoBlob ? (
          <PhotoImg
            blob={expense.photoBlob}
            className="w-full rounded-2xl object-contain"
            alt="Struk"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
            Tidak ada foto
          </div>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-3xl font-bold text-slate-900">
            {formatIDR(cnyToIdr(expense.amountCNY, rate))}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-500">{formatCNY(expense.amountCNY)}</p>

          <dl className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
            <Row label="Keterangan">
              {expense.description || <span className="text-slate-400">—</span>}
            </Row>
            <Row label="Kategori">
              <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + style.badge}>
                {expense.category}
              </span>
            </Row>
            <Row label="Tanggal">{formatLongDate(expense.date)}</Row>
            <Row label="Kurs dipakai">¥1 = Rp {rate.toLocaleString('id-ID')}</Row>
          </dl>
        </div>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="w-full rounded-xl border border-rose-200 bg-rose-50 py-3 text-sm font-semibold text-rose-600"
          >
            Hapus pengeluaran
          </button>
        ) : (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
            <p className="text-sm font-medium text-rose-700">Yakin hapus pengeluaran ini?</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white"
              >
                Hapus
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  )
}
