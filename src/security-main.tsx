import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './security/security.css'
import SecurityApp from './security/SecurityApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SecurityApp />
  </StrictMode>,
)
