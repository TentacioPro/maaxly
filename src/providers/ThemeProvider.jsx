import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'

// Simple theme manager inspired by tweakcn ThemeProvider/ThemeScript.
// Exposes: theme (light/dark/system), resolvedTheme (light/dark), setTheme, setFont, setTokens

const ThemeContext = createContext(null)

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeClass(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const resolved = theme === 'system' ? getSystemTheme() : theme
  if (resolved === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

function applyFont(fontFamily) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (fontFamily) root.style.setProperty('--font-sans', fontFamily)
  else root.style.removeProperty('--font-sans')
}

function applyTokens(tokens, resolvedTheme) {
  if (typeof document === 'undefined' || !tokens) return
  const root = document.documentElement
  const map = tokens.light || tokens.dark ? (resolvedTheme === 'dark' ? tokens.dark : tokens.light) : tokens
  if (!map) return
  Object.entries(map).forEach(([k, v]) => {
    root.style.setProperty(k, v)
  })
}

export function ThemeScript() {
  // Inline script to set theme before React paints (prevents FOUC)
  const code = `(() => { try {
    var t = localStorage.getItem('theme') || 'system';
    var d = t === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
    var root = document.documentElement;
    if (d === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    var tk = localStorage.getItem('theme:tokens') || localStorage.getItem('theme:primary');
    if (tk) try {
      var obj = JSON.parse(tk);
      var map = (obj && (obj.light || obj.dark)) ? (d === 'dark' ? obj.dark : obj.light) : obj;
      if (map) Object.entries(map).forEach(function([k,v]){ root.style.setProperty(k, v); });
    } catch(e){}
    var ff = localStorage.getItem('theme:font');
    if (ff) root.style.setProperty('--font-sans', ff);
  } catch(e) {} })();`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}

export function ThemeProvider({ children, defaultTheme = 'system' }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme
    return localStorage.getItem('theme') || defaultTheme
  })
  const [font, setFontState] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('theme:font') : null))
  const [tokens, setTokensState] = useState(() => {
    if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('theme:tokens') || localStorage.getItem('theme:primary')
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  })

  const resolvedTheme = useMemo(() => (theme === 'system' ? getSystemTheme() : theme), [theme])

  // React to system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return
    const mm = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyThemeClass('system')
    mm.addEventListener('change', handler)
    return () => mm.removeEventListener('change', handler)
  }, [theme])

  useLayoutEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  useLayoutEffect(() => {
    applyFont(font)
  }, [font])

  useLayoutEffect(() => {
    applyTokens(tokens, resolvedTheme)
  }, [tokens, resolvedTheme])

  function setTheme(next) {
    setThemeState(next)
    try { localStorage.setItem('theme', next) } catch {}
  }

  function setFont(next) {
    setFontState(next)
    try { next ? localStorage.setItem('theme:font', next) : localStorage.removeItem('theme:font') } catch {}
  }

  function setTokens(next) {
    setTokensState(next)
    try {
      if (next) {
        localStorage.setItem('theme:tokens', JSON.stringify(next))
        localStorage.removeItem('theme:primary')
      } else {
        localStorage.removeItem('theme:tokens')
      }
    } catch {}
  }

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme, font, setFont, tokens, setTokens }), [theme, resolvedTheme, font, tokens])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
