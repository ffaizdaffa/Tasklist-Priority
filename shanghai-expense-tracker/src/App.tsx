import { useState } from 'react'
import { BottomNav, type Tab } from './components/BottomNav'
import { Dashboard } from './pages/Dashboard'
import { History } from './pages/History'
import { Settings } from './pages/Settings'
import { AddExpense } from './pages/AddExpense'
import { ExpenseDetail } from './pages/ExpenseDetail'

type Overlay =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'edit'; id: number }
  | { kind: 'detail'; id: number }

export default function App() {
  const [tab, setTab] = useState<Tab>('rekap')
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' })

  const closeOverlay = () => setOverlay({ kind: 'none' })

  // Full-screen overlays take over the viewport.
  if (overlay.kind === 'add') {
    return <AddExpense onDone={closeOverlay} onCancel={closeOverlay} />
  }
  if (overlay.kind === 'edit') {
    return (
      <AddExpense
        editId={overlay.id}
        onDone={() => setOverlay({ kind: 'detail', id: overlay.id })}
        onCancel={() => setOverlay({ kind: 'detail', id: overlay.id })}
      />
    )
  }
  if (overlay.kind === 'detail') {
    return (
      <ExpenseDetail
        id={overlay.id}
        onBack={closeOverlay}
        onEdit={(id) => setOverlay({ kind: 'edit', id })}
      />
    )
  }

  return (
    <div className="min-h-full">
      {tab === 'rekap' && <Dashboard />}
      {tab === 'riwayat' && <History onSelect={(id) => setOverlay({ kind: 'detail', id })} />}
      {tab === 'settings' && <Settings />}

      <BottomNav active={tab} onTab={setTab} onAdd={() => setOverlay({ kind: 'add' })} />
    </div>
  )
}
