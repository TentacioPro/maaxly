import React, { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react'
import { Sun, Moon, Laptop } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { themePresets } from '@/theme/presets'

const presetFonts = [
  'Inter, ui-sans-serif, system-ui',
  'Segoe UI, Arial, sans-serif',
  'Roboto, Arial, sans-serif',
  'Georgia, serif',
  'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
]

const defaultPrimaryTokens = {
  '--primary': 'oklch(0.5461 0.2152 262.8809)',
  '--primary-foreground': 'oklch(1 0 0)'
}

export default function PersonalizationPanel() {
  const { theme, resolvedTheme, setTheme, font, setFont, tokens, setTokens } = useTheme()
  const [fontLocal, setFontLocal] = useState(font || '')
  const initialPrimary = useMemo(() => {
    if (!tokens) return defaultPrimaryTokens['--primary']
    const map = tokens.light || tokens.dark ? (resolvedTheme === 'dark' ? tokens.dark : tokens.light) : tokens
    return map?.['--primary'] || defaultPrimaryTokens['--primary']
  }, [])
  const [primary, setPrimary] = useState(initialPrimary)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const previewKeysRef = useRef([])

  const liveTokens = useMemo(() => ({ '--primary': primary, '--ring': primary }), [primary])

  // Live preview without persistence
  useEffect(() => {
    const root = document.documentElement
    if (fontLocal) root.style.setProperty('--font-sans', fontLocal)
    return () => {}
  }, [fontLocal])

  useEffect(() => {
    const root = document.documentElement
    Object.entries(liveTokens).forEach(([k, v]) => root.style.setProperty(k, v))
    return () => {}
  }, [liveTokens])

  // Load previously chosen preset
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme:preset')
      if (saved) {
        setSelectedPreset(saved)
        const preset = themePresets.find((p) => p.id === saved)
        if (preset) {
          const root = document.documentElement
          const map = preset.tokens.light || preset.tokens.dark ? (resolvedTheme === 'dark' ? preset.tokens.dark : preset.tokens.light) : preset.tokens
          if (map) {
            const keys = []
            Object.entries(map).forEach(([k, v]) => { root.style.setProperty(k, v); keys.push(k) })
            previewKeysRef.current = keys
            if (map['--primary']) setPrimary(map['--primary'])
          }
        }
      }
    } catch {}
  }, [])

  function applyPresetPreview(preset) {
    const id = preset?.id || null
    setSelectedPreset(id)
    if (!preset) return
    const root = document.documentElement
    // clear previous preview keys
    if (previewKeysRef.current?.length) {
      previewKeysRef.current.forEach((k) => root.style.removeProperty(k))
      previewKeysRef.current = []
    }
    const map = preset.tokens.light || preset.tokens.dark ? (resolvedTheme === 'dark' ? preset.tokens.dark : preset.tokens.light) : preset.tokens
    if (map) {
      const keys = []
      Object.entries(map).forEach(([k, v]) => { root.style.setProperty(k, v); keys.push(k) })
      previewKeysRef.current = keys
      if (map['--primary']) setPrimary(map['--primary'])
    }
    // Persist chosen preset id and its full tokens so it "sticks" across variant toggles
    try { localStorage.setItem('theme:preset', id) } catch {}
    const light = preset.tokens.light || preset.tokens || {}
    const dark = preset.tokens.dark || preset.tokens || {}
    setTokens({ light: { ...light }, dark: { ...dark } })
  }

  // When theme variant changes (light/dark), if a preset is selected, reapply its matching variant
  useLayoutEffect(() => {
    if (!selectedPreset) return
    const preset = themePresets.find((p) => p.id === selectedPreset)
    if (!preset) return
    const root = document.documentElement
    // clear previous preview keys
    if (previewKeysRef.current?.length) {
      previewKeysRef.current.forEach((k) => root.style.removeProperty(k))
      previewKeysRef.current = []
    }
    const map = preset.tokens.light || preset.tokens.dark ? (resolvedTheme === 'dark' ? preset.tokens.dark : preset.tokens.light) : preset.tokens
    if (map) {
      const keys = []
      Object.entries(map).forEach(([k, v]) => { root.style.setProperty(k, v); keys.push(k) })
      previewKeysRef.current = keys
      if (map['--primary']) setPrimary(map['--primary'])
    }
  }, [resolvedTheme, selectedPreset])

  function handleApply() {
    setFont(fontLocal || null)
    // Build tokens object: if a preset is selected, merge it and override primary from liveTokens
    let toPersist = null
    if (selectedPreset) {
      const preset = themePresets.find(p => p.id === selectedPreset)
      if (preset) {
        const light = { ...(preset.tokens.light || preset.tokens || {}), ...liveTokens }
        const dark = { ...(preset.tokens.dark || preset.tokens || {}), ...liveTokens }
        toPersist = { light, dark }
      }
    } else {
      // No preset: store same overrides for both variants so switching theme keeps color
      toPersist = { light: { ...liveTokens }, dark: { ...liveTokens } }
    }
    setTokens(toPersist)
  }

  function handleReset() {
    setFont(null)
    setTokens(null)
    setPrimary(defaultPrimaryTokens['--primary'])
  const root = document.documentElement
  root.style.removeProperty('--font-sans')
  Object.keys(liveTokens).forEach((k) => root.style.removeProperty(k))
  if (previewKeysRef.current?.length) {
    previewKeysRef.current.forEach((k) => root.style.removeProperty(k))
    previewKeysRef.current = []
  }
  setSelectedPreset(null)
  try { localStorage.removeItem('theme:preset') } catch {}
  }

  return (
    <div className="p-4 space-y-6">
  <section>
        <h3 className="text-sm font-semibold mb-2">Theme</h3>
        <div className="grid grid-cols-3 gap-2">
          <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}><Sun className="mr-2 size-4"/>Light</Button>
          <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}><Moon className="mr-2 size-4"/>Dark</Button>
          <Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => setTheme('system')}><Laptop className="mr-2 size-4"/>System</Button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Presets</h3>
        <div className="grid grid-cols-2 gap-2">
          {themePresets.map((p) => (
            <Button key={p.id} variant={selectedPreset === p.id ? 'default' : 'outline'} onClick={() => applyPresetPreview(p)}>
              <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: p.preview }} />
              {p.name}
            </Button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Font</h3>
        <div className="space-y-2">
          <Input value={fontLocal} onChange={(e) => setFontLocal(e.target.value)} placeholder="CSS font-family value" />
          <div className="flex flex-wrap gap-2">
            {presetFonts.map((f) => (
              <Button key={f} variant="outline" size="sm" onClick={() => setFontLocal(f)}>{f.split(',')[0]}</Button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Primary Color Token</h3>
        <Input value={primary} onChange={(e) => setPrimary(e.target.value)} placeholder="oklch(...) or color" />
        <p className="text-xs text-muted-foreground mt-1">Maps to --primary and --ring tokens.</p>
      </section>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleApply}>Apply</Button>
        <Button variant="outline" onClick={handleReset}>Reset</Button>
      </div>
    </div>
  )
}
