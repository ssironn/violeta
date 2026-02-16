import { useState, useRef, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import type { AccentColor } from '../../contexts/ThemeContext'

const ACCENTS: { name: AccentColor; color: string; label: string }[] = [
  { name: 'violet', color: '#8b5cf6', label: 'Violeta' },
  { name: 'rose', color: '#f43f5e', label: 'Rosa' },
  { name: 'sky', color: '#0ea5e9', label: 'Azul' },
  { name: 'emerald', color: '#10b981', label: 'Verde' },
  { name: 'amber', color: '#f59e0b', label: 'Dourado' },
  { name: 'slate', color: '#64748b', label: 'Neutro' },
]

export function ThemePopover() {
  const { mode, accent, setMode, setAccent } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={mode === 'dark' ? 'Tema escuro' : 'Tema claro'}
        className={`p-1.5 rounded transition-all duration-150 flex items-center justify-center
          ${open
            ? 'bg-accent-600/20 text-accent-500'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
          }`}
      >
        {mode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-[100] w-52 rounded-lg border border-surface-border bg-surface-elevated shadow-lg"
          style={{ animation: 'scale-in 0.12s ease-out' }}
        >
          <div className="p-3 space-y-3">
            {/* Mode toggle */}
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-text-muted mb-2">
                Tema
              </p>
              <div className="flex rounded-md border border-surface-border overflow-hidden">
                <button
                  onClick={() => setMode('dark')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[0.72rem] font-medium transition-all ${
                    mode === 'dark'
                      ? 'bg-accent-600 text-white'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <Moon size={12} />
                  Escuro
                </button>
                <button
                  onClick={() => setMode('light')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[0.72rem] font-medium transition-all border-l border-surface-border ${
                    mode === 'light'
                      ? 'bg-accent-600 text-white'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <Sun size={12} />
                  Claro
                </button>
              </div>
            </div>

            {/* Accent color */}
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-text-muted mb-2">
                Cor de destaque
              </p>
              <div className="flex gap-2 justify-center">
                {ACCENTS.map(({ name, color, label }) => (
                  <button
                    key={name}
                    onClick={() => setAccent(name)}
                    title={label}
                    className="relative w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{ backgroundColor: color }}
                  >
                    {accent === name && (
                      <span
                        className="absolute inset-0 rounded-full ring-2 ring-offset-2"
                        style={{ '--tw-ring-color': color, '--tw-ring-offset-color': 'var(--color-surface-elevated)' } as React.CSSProperties}
                      />
                    )}
                    {accent === name && (
                      <svg className="absolute inset-0 m-auto w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
