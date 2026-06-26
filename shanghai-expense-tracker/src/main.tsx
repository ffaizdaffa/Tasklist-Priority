import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ensureSettings } from './db'
import { registerSW } from 'virtual:pwa-register'

// Create the default settings row once (outside any live query / read txn).
ensureSettings()

// Auto-update the service worker in the background.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
