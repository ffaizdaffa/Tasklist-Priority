import type { Expense } from '../types'
import { cnyToIdr } from './currency'

function escapeCsv(value: string | number): string {
  const s = String(value)
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

/** Build a CSV string from expenses (tanggal, keterangan, kategori, CNY, IDR). */
export function expensesToCSV(expenses: Expense[], rate: number): string {
  const header = ['Tanggal', 'Keterangan', 'Kategori', 'CNY', 'IDR']
  const rows = expenses.map((e) => [
    escapeCsv(e.date),
    escapeCsv(e.description),
    escapeCsv(e.category),
    escapeCsv(e.amountCNY),
    escapeCsv(cnyToIdr(e.amountCNY, rate)),
  ])
  return [header, ...rows].map((r) => r.join(',')).join('\n')
}

/** Trigger a browser download of the CSV. */
export function downloadCSV(csv: string, filename: string): void {
  // Prepend BOM so Excel reads UTF-8 (¥ etc.) correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
