import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEYS = {
  theme: 'theme',
  font: 'theme:font',
  tokens: 'theme:tokens',
  legacyTokens: 'theme:primary',
}

const DEFAULT_TOKENS = {
  light: {
    '--background': 'oklch(0.975 0.015 258)',
    '--foreground': 'oklch(0.23 0.03 262)',
    '--card': 'rgba(248, 250, 255, 0.82)',
    '--card-foreground': 'oklch(0.23 0.03 262)',
    '--popover': 'rgba(255, 255, 255, 0.92)',
    '--popover-foreground': 'oklch(0.23 0.03 262)',
    '--primary': 'oklch(0.63 0.23 262)',
    '--primary-foreground': 'oklch(0.99 0 0)',
    '--secondary': 'rgba(235, 244, 255, 0.72)',
    '--secondary-foreground': 'oklch(0.36 0.05 254)',
    '--muted': 'rgba(210, 220, 255, 0.32)',
    '--muted-foreground': 'rgba(78, 88, 122, 0.75)',
    '--accent': 'rgba(236, 72, 153, 0.14)',
    '--accent-foreground': 'oklch(0.4 0.12 350)',
    '--destructive': 'oklch(0.63 0.19 24)',
    '--destructive-foreground': 'oklch(0.99 0 0)',
    '--border': 'rgba(122, 133, 190, 0.26)',
    '--input': 'rgba(248, 250, 255, 0.82)',
    '--ring': 'oklch(0.63 0.23 262)',
    '--surface-base': 'rgba(255, 255, 255, 0.55)',
    '--surface-card': 'rgba(246, 248, 255, 0.78)',
    '--surface-elevated': 'rgba(241, 244, 255, 0.92)',
    '--surface-muted': 'rgba(232, 236, 255, 0.46)',
    '--surface-input': 'rgba(252, 253, 255, 0.9)',
    '--surface-overlay': 'rgba(255, 255, 255, 0.68)',
    '--surface-blur': '18px',
    '--shadow-soft': '0 24px 45px -28px rgba(70, 80, 150, 0.45)',
    '--shadow-pop': '0 32px 65px -24px rgba(68, 78, 172, 0.45)',
    '--shadow-input': '0 10px 30px -20px rgba(55, 65, 120, 0.5)',
    '--border-subtle': 'rgba(126, 134, 185, 0.28)',
    '--border-strong': 'rgba(99, 102, 241, 0.35)',
    '--text-muted': 'rgba(74, 84, 118, 0.78)',
    '--app-gradient': 'linear-gradient(140deg, rgba(99,102,241,0.18) 0%, rgba(236,72,153,0.16) 42%, rgba(56,189,248,0.16) 78%)',
    '--font-size-base': '16px',
  },
  dark: {
    '--background': 'oklch(0.16 0.032 259)',
    '--foreground': 'oklch(0.93 0.015 250)',
    '--card': 'rgba(18, 22, 36, 0.78)',
    '--card-foreground': 'oklch(0.93 0.015 250)',
    '--popover': 'rgba(14, 17, 28, 0.85)',
    '--popover-foreground': 'oklch(0.93 0.015 250)',
    '--primary': 'oklch(0.7 0.2 262)',
    '--primary-foreground': 'oklch(0.99 0 0)',
    '--secondary': 'rgba(38, 45, 70, 0.68)',
    '--secondary-foreground': 'oklch(0.82 0.02 255)',
    '--muted': 'rgba(38, 45, 70, 0.55)',
    '--muted-foreground': 'rgba(180, 190, 230, 0.65)',
    '--accent': 'rgba(236, 72, 153, 0.24)',
    '--accent-foreground': 'oklch(0.9 0.05 350)',
    '--destructive': 'oklch(0.55 0.17 24)',
    '--destructive-foreground': 'oklch(0.99 0 0)',
    '--border': 'rgba(68, 76, 120, 0.4)',
    '--input': 'rgba(30, 34, 50, 0.74)',
    '--ring': 'oklch(0.7 0.2 262)',
    '--surface-base': 'rgba(17, 21, 34, 0.72)',
    '--surface-card': 'rgba(22, 26, 42, 0.82)',
    '--surface-elevated': 'rgba(28, 34, 54, 0.86)',
    '--surface-muted': 'rgba(38, 45, 70, 0.52)',
    '--surface-input': 'rgba(30, 35, 54, 0.78)',
    '--surface-overlay': 'rgba(20, 24, 38, 0.76)',
    '--surface-blur': '22px',
    '--shadow-soft': '0 28px 55px -24px rgba(8, 10, 18, 0.85)',
    '--shadow-pop': '0 38px 80px -30px rgba(8, 12, 28, 0.9)',
    '--shadow-input': '0 16px 35px -28px rgba(5, 8, 18, 0.85)',
    '--border-subtle': 'rgba(72, 82, 126, 0.38)',
    '--border-strong': 'rgba(129, 140, 248, 0.55)',
    '--text-muted': 'rgba(197, 204, 232, 0.72)',
    '--app-gradient': 'linear-gradient(140deg, rgba(79,70,229,0.3) 0%, rgba(236,72,153,0.24) 38%, rgba(56,189,248,0.28) 78%)',
    '--font-size-base': '16px',
  },
}

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyThemeClass(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const resolved = theme === 'system' ? getSystemTheme() : theme
  root.dataset.themeMode = resolved
  if (resolved === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

function applyFont(fontFamily) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (fontFamily) root.style.setProperty('--font-sans', fontFamily)
  else root.style.removeProperty('--font-sans')
}

function mergeTokenSets(base, custom) {
  if (!custom) {
    return base
  }
  const merged = {
    light: { ...base.light },
    dark: { ...base.dark },
  }

  if (custom.light || custom.dark) {
    if (custom.light) Object.assign(merged.light, custom.light)
    if (custom.dark) Object.assign(merged.dark, custom.dark)
  } else {
    Object.assign(merged.light, custom)
    Object.assign(merged.dark, custom)
  }

  return merged
}

function resolveTokenSet(tokens, mode) {
  if (!tokens) return null
  if (tokens.light || tokens.dark) {
    return tokens[mode] || tokens.light || tokens.dark || null
  }
  return tokens
}

function applyTokensToRoot(tokens, mode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const resolved = resolveTokenSet(tokens, mode)
  if (!resolved) return
  Object.entries(resolved).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  root.dataset.themeMode = mode
  root.style.setProperty('--theme-mode', mode)
}

function loadStoredTokens() {
  if (typeof window === 'undefined') return null
  const raw =
    window.localStorage.getItem(STORAGE_KEYS.tokens) ||
    window.localStorage.getItem(STORAGE_KEYS.legacyTokens)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.warn('Unable to parse stored theme tokens', error)
    return null
  }
}

export function ThemeScript({ defaultTheme = 'system' } = {}) {
  const code = `(() => {
    try {
      const root = document.documentElement;
      const storedTheme = localStorage.getItem('${STORAGE_KEYS.theme}') || '${defaultTheme}';
      const mode = storedTheme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : storedTheme;
      root.dataset.themeMode = mode;
      if (mode === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
      const tokensRaw = localStorage.getItem('${STORAGE_KEYS.tokens}') || localStorage.getItem('${STORAGE_KEYS.legacyTokens}');
      if (tokensRaw) {
        try {
          const parsed = JSON.parse(tokensRaw);
          const tokenMap = parsed && (parsed.light || parsed.dark) ? (parsed[mode] || parsed.light || parsed.dark) : parsed;
          if (tokenMap) {
            for (const key in tokenMap) {
              if (Object.prototype.hasOwnProperty.call(tokenMap, key)) {
                root.style.setProperty(key, tokenMap[key]);
              }
            }
          }
        } catch (err) {
          console.warn('Unable to parse stored theme tokens', err);
        }
      }
      const ff = localStorage.getItem('${STORAGE_KEYS.font}');
      if (ff) root.style.setProperty('--font-sans', ff);
    } catch (error) {
      console.warn('ThemeScript failed', error);
    }
  })();`

  return <script dangerouslySetInnerHTML={{ __html: code }} />
}

export function ThemeProvider({ children, defaultTheme = 'system' }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme
    return window.localStorage.getItem(STORAGE_KEYS.theme) || defaultTheme
  })

  const [font, setFontState] = useState(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(STORAGE_KEYS.font)
  })

  const [customTokens, setCustomTokens] = useState(() => loadStoredTokens())

  const resolvedTheme = useMemo(
    () => (theme === 'system' ? getSystemTheme() : theme),
    [theme]
  )

  const mergedTokens = useMemo(
    () => mergeTokenSets(DEFAULT_TOKENS, customTokens),
    [customTokens]
  )

  // React to system scheme changes when using system theme
  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyThemeClass('system')
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme])

  useLayoutEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  useLayoutEffect(() => {
    applyFont(font)
  }, [font])

  useLayoutEffect(() => {
    applyTokensToRoot(mergedTokens, resolvedTheme)
  }, [mergedTokens, resolvedTheme])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, next)
    } catch {}
  }, [])

  const setFont = useCallback((next) => {
    setFontState(next)
    try {
      if (next) window.localStorage.setItem(STORAGE_KEYS.font, next)
      else window.localStorage.removeItem(STORAGE_KEYS.font)
    } catch {}
  }, [])

  const setTokens = useCallback((updater) => {
    setCustomTokens((prev) => {
      const nextValue = typeof updater === 'function' ? updater(prev) : updater || null
      try {
        if (nextValue) {
          window.localStorage.setItem(STORAGE_KEYS.tokens, JSON.stringify(nextValue))
        } else {
          window.localStorage.removeItem(STORAGE_KEYS.tokens)
        }
        window.localStorage.removeItem(STORAGE_KEYS.legacyTokens)
      } catch {}
      return nextValue
    })
  }, [])

  const resetTokens = useCallback(() => {
    setTokens(null)
  }, [setTokens])

  const resolvedTokens = useMemo(
    () => resolveTokenSet(mergedTokens, resolvedTheme) || {},
    [mergedTokens, resolvedTheme]
  )

  const contextValue = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      font,
      setFont,
      tokens: resolvedTokens,
      allTokens: mergedTokens,
      setTokens,
      resetTokens,
      customTokens,
      isDark: resolvedTheme === 'dark',
      meta: {
        surfaces: {
          base: 'var(--surface-base)',
          card: 'var(--surface-card)',
          elevated: 'var(--surface-elevated)',
        },
        shadows: {
          soft: 'var(--shadow-soft)',
          pop: 'var(--shadow-pop)',
          input: 'var(--shadow-input)',
        },
      },
    }),
    [
      theme,
      resolvedTheme,
      setTheme,
      font,
      setFont,
      resolvedTokens,
      mergedTokens,
      setTokens,
      resetTokens,
      customTokens,
    ]
  )

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
