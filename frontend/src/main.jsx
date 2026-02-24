import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import './setupDeviceId'
import { TranslationProvider } from './i18n/TranslationProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TranslationProvider>
        <App className="app-root" />
      </TranslationProvider>
    </BrowserRouter>
  </StrictMode>,
)
