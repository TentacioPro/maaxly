import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider, ThemeScript } from '@/providers/ThemeProvider'
import { MessagingProvider } from '@/providers/MessagingProvider'
import { ProfileProvider } from '@/providers/ProfileProvider'

createRoot(document.getElementById('root')).render(
  <ThemeProvider defaultTheme="system">
    <ThemeScript />
    <MessagingProvider>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </MessagingProvider>
  </ThemeProvider>
)
