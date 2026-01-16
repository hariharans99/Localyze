import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { UserProvider } from './contexts/UserContext.tsx'
import { ToastProvider } from './contexts/ToastContext.tsx'
import App from './App.tsx'

import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <UserProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </UserProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
)
