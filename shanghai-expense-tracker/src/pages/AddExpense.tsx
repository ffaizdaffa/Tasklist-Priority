import { useEffect, useRef, useState } from 'react'
import { db } from '../db'
import { CATEGORIES, type Category } from '../types'
import { useExpense, useRate } from '../hooks/useData'
import { compressImage, readExifDate } from '../lib/image'
import { cnyToIdr, formatIDR } from '../lib/currency'
import { todayISO } from '../lib/date'
import { PhotoImg } from '../components/PhotoImg'

interface Props {
  editId?: number | null
  onDone: () => void
  onCancel: () => void
}

export function AddExpense({ editId, onDone, onCancel }: Props) {
  const editing = editId != null
  const existing = useExpense(editId ?? null)
  const rate = useRate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('Makanan')
  const [amountCNY, setAmountCNY] = useState('')
  const [photoBlob, setPhotoBlob] = useState<Blob | undefined>(undefined)
  const [compressing, setCompressing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadedId, setLoadedId] = useState<number | null>(null)

  // Populate fields when editing an existing expense (once it loads).
  useEffect(() => {
    if (editing && existing && existing.id !== loadedId) {
      setDate(existing.date)
      setDescription(existing.description)
      setCategory(existing.category)
      setAmountCNY(String(existing.amountCNY))
      setPhotoBlob(existing.photoBlob)
      setLoadedId(existing.id ?? null)
    }
  }, [editing, existing, loadedId])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCompressing(true)
    try {
      // Auto-fill date from EXIF if available (only when not editing / still default).
      const exif = await readExifDate(file)
      if (exif) setDate(exif)
      const blob = await compressImage(file, 1080, 0.8)
      setPhotoBlob(blob)
    } finally {
      setCompressing(false)
      // reset so picking the same file again re-triggers change
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const cnyNum = parseFloat(amountCNY.replace(',', '.')) || 0
  const idrPreview = cnyToIdr(cnyNum, rate)
  const canSave = cnyNum > 0 && !saving && !compressing

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      if (editing && editId != null) {
        await db.expenses.update(editId, {
          date,
          description: description.trim(),
          category,
          amountCNY: cnyNum,
          photoBlob,
        })
      } else {
        await db.expenses.add({
          date,
          description: description.trim(),
          category,
          amountCNY: cnyNum,
          photoBlob,
          createdAt: new Date().toISOString(),
        })
      }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <button onClick={onCancel} className="text-sm font-medium text-slate-500">
          Batal
        </button>
        <h1 className="text-base font-semibold text-slate-900">
          {editing ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
        </h1>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="text-sm font-semibold text-brand disabled:text-slate-300"
        >
          {saving ? 'Simpan…' : 'Simpan'}
        </button>
      </header>

      <div className="flex flex-col gap-4 p-4 pb-28">
        {/* Photo */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={compressing}
            className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white text-slate-400"
          >
            {compressing ? (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Spinner />
                <span className="text-sm">Mengompres foto…</span>
              </div>
            ) : photoBlob ? (
              <PhotoImg blob={photoBlob} className="h-full w-full object-cover" alt="Struk" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                <span className="text-sm font-medium">Foto struk / belanjaan</span>
                <span className="text-xs text-slate-400">Kamera atau galeri</span>
              </div>
            )}
          </button>
          {photoBlob && !compressing && (
            <button
              onClick={() => setPhotoBlob(undefined)}
              className="mt-2 text-xs font-medium text-rose-500"
            >
              Hapus foto
            </button>
          )}
        </div>

        {/* Amount CNY */}
        <Field label="Nominal (CNY)">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand">
            <span className="text-lg font-semibold text-slate-400">¥</span>
            <input
              type="number"
              inputMode="decimal"
              value={amountCNY}
              onChange={(e) => setAmountCNY(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent px-2 py-3 text-lg font-semibold text-slate-900 outline-none"
            />
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            ≈ <span className="font-semibold text-brand">{formatIDR(idrPreview)}</span>
            <span className="text-xs text-slate-400"> (kurs {rate.toLocaleString('id-ID')})</span>
          </p>
        </Field>

        {/* Date */}
        <Field label="Tanggal">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none focus:border-brand"
          />
        </Field>

        {/* Description */}
        <Field label="Keterangan">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="cth: Xiaolongbao di Nanxiang"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none focus:border-brand"
          />
        </Field>

        {/* Category */}
        <Field label="Kategori">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none focus:border-brand"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  )
}

function Spinner() {
  return (
    <svg className="h-7 w-7 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  )
}
