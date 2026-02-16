import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light'
export type AccentColor = 'violet' | 'rose' | 'sky' | 'emerald' | 'amber' | 'slate'

interface ThemeContextValue {
  mode: ThemeMode
  accent: AccentColor
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: AccentColor) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'violeta-theme'

interface StoredTheme {
  mode: ThemeMode
  accent: AccentColor
}

function readStored(): StoredTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        mode: parsed.mode === 'light' ? 'light' : 'dark',
        accent: (['violet', 'rose', 'sky', 'emerald', 'amber', 'slate'] as const).includes(parsed.accent)
          ? parsed.accent
          : 'violet',
      }
    }
  } catch { /* ignore */ }
  return { mode: 'dark', accent: 'violet' }
}

function applyToDOM(mode: ThemeMode, accent: AccentColor) {
  const html = document.documentElement
  html.setAttribute('data-theme', mode)
  html.setAttribute('data-accent', accent)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStored().mode)
  const [accent, setAccentState] = useState<AccentColor>(() => readStored().accent)

  useEffect(() => {
    applyToDOM(mode, accent)
  }, [mode, accent])

  const persist = useCallback((m: ThemeMode, a: AccentColor) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: m, accent: a }))
  }, [])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    persist(m, accent)
    applyToDOM(m, accent)
  }, [accent, persist])

  const setAccent = useCallback((a: AccentColor) => {
    setAccentState(a)
    persist(mode, a)
    applyToDOM(mode, a)
  }, [mode, persist])

  const toggleMode = useCallback(() => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
  }, [mode, setMode])

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
