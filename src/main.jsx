import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

const hostname = window.location.hostname.toLowerCase()

async function bootstrap() {
  let App

  if (hostname === 'alliance-air-cargosuperadmin.onrender.com') {
    ;({ default: App } = await import('../super-admin/src/App.jsx'))
    await import('../super-admin/src/styles.css')
    document.title = 'Super Admin Console | Alliance Air Cargo'
  } else if (hostname === 'alliance-air-cargo-1-client-page.onrender.com') {
    ;({ default: App } = await import('../client-portal/src/App.jsx'))
    await import('../client-portal/src/styles.css')
    document.title = 'Client Portal | Alliance Air Cargo'
  } else {
    ;({ default: App } = await import('./App.jsx'))
    await import('./styles.css')
    document.title = 'Alliance Air Cargo | Air Freight & Logistics'
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
