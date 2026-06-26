import { useEffect, useState } from 'react'
import { saveSettings } from '../db'
import { useExpenses, useSettings } from '../hooks/useData'
import { fetchLiveRate } from '../lib/rate'
import { expensesToCSV, downloadCSV } from '../lib/csv'
import { formatDateTime, todayISO } from '../lib/date'

export function Settings() {
  const settings = useSettings()
  const expenses = useExpenses()

  const [rateInput, setRateInput] = useState('')
  const [dirty, setDirty] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (settings && !dirty) setRateInput(String(settings.exchangeRate))
  }, [settings, dirty])

  async function handleSaveRate() {
    const val = parseFloat(rateInput.replace(',', '.'))
    if (!isFinite(val) || val <= 0) {
      setMsg({ type: 'err', text: 'Kurs harus angka lebih dari 0.' })
      return
    }
    await saveSettings({ exchangeRate: val, rateUpdatedAt: new Date().toISOString() })
    setDirty(false)
    setMsg({ type: 'ok', text: 'Kurs manual tersimpan.' })
  }

  async function handleLiveUpdate() {
    setUpdating(true)
    setMsg(null)
    try {
      const rate = await fetchLiveRate()
      const rounded = Math.round(rate)
      await saveSettings({ exchangeRate: rounded, rateUpdatedAt: new Date().toISOString() })
      setRateInput(String(rounded))
      setDirty(false)
      setMsg({ type: 'ok', text: `Kurs live diperbarui: ¥1 = Rp ${rounded.toLocaleString('id-ID')}` })
    } catch {
      setMsg({
        type: 'err',
        text: 'Gagal ambil kurs live (offline?). Tetap pakai kurs terakhir.',
      })
    } finally {
      setUpdating(false)
    }
  }

  function handleExport() {
    if (!expenses || !settings) return
    if (expenses.length === 0) {
      setMsg({ type: 'err', text: 'Belum ada data untuk diekspor.' })
      return
    }
    const csv = expensesToCSV(expenses, settings.exchangeRate)
    downloadCSV(csv, `shanghai-expense-${todayISO()}.csv`)
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="px-4 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </header>

      <div className="space-y-4 px-4 pb-28">
        {/* Exchange rate */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Kurs CNY → IDR</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Semua nominal IDR dihitung dari kurs ini.
          </p>

          <div className="mt-3 flex items-center rounded-xl border border-slate-200 px-3 focus-within:border-brand">
            <span className="text-sm font-medium text-slate-400">¥1 = Rp</span>
            <input
              type="number"
              inputMode="decimal"
              value={rateInput}
              onChange={(e) => {
                setRateInput(e.target.value)
                setDirty(true)
              }}
              className="w-full bg-transparent px-2 py-3 text-lg font-semibold text-slate-900 outline-none"
            />
          </div>

          {settings && (
            <p className="mt-2 text-xs text-slate-400">
              Terakhir diperbarui: {formatDateTime(settings.rateUpdatedAt)}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSaveRate}
              disabled={!dirty}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 disabled:text-slate-300"
            >
              Simpan manual
            </button>
            <button
              onClick={handleLiveUpdate}
              disabled={updating}
              className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {updating ? 'Mengambil…' : 'Update kurs live'}
            </button>
          </div>

          {msg && (
            <p
              className={
                'mt-3 rounded-lg px-3 py-2 text-xs font-medium ' +
                (msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')
              }
            >
              {msg.text}
            </p>
          )}
        </section>

        {/* Export */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Export Data</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Unduh semua pengeluaran ke CSV (tanggal, keterangan, kategori, CNY, IDR).
          </p>
          <button
            onClick={handleExport}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export CSV {expenses ? `(${expenses.length})` : ''}
          </button>
        </section>

        <p className="px-2 pt-2 text-center text-xs text-slate-400">
          Shanghai Expense Tracker · data tersimpan offline di perangkat ini.
        </p>
      </div>
    </div>
  )
}
