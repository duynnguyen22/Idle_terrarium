import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { loadCustomBackdrop } from './lib/backdropPhoto'
import './index.css'

// Restore an uploaded backdrop photo; the renderer picks it up once it decodes
void loadCustomBackdrop()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
