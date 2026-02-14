import { type ReactNode, useState, useRef, useEffect, lazy, Suspense } from 'react'
import { X, Pencil } from 'lucide-react'
import katex from 'katex'
import { katexMacros } from '../../latex/katexMacros'
import { useKatexPreview } from './useKatexPreview'
import { detectMathType } from './detectMathType'

// Lazy import to avoid circular dependency (MathModalShell → MathEditRouter → editors → MathModalShell)
const LazyMathEditRouter = lazy(() =>
  import('./MathEditRouter').then(m => ({ default: m.MathEditRouter }))
)

interface MathModalShellProps {
  title: string
  latex: string
  children: ReactNode
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  /** Extra wide for matrix etc. */
  wide?: boolean
  /** Hide delete button when inserting new math */
  isInsert?: boolean
}

export function MathModalShell({
  title,
  latex,
  children,
  onSave,
  onDelete,
  onClose,
  wide,
  isInsert,
}: MathModalShellProps) {
  const previewRef = useKatexPreview(latex)

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative border border-surface-border rounded-2xl shadow-[0_24px_80px_rgba(88,28,135,0.3)] overflow-hidden ${
          wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'
        } mx-4`}
        style={{
          background: 'linear-gradient(170deg, #2a1842 0%, #1a1028 40%, #150d22 100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <h3 className="text-[13px] font-semibold tracking-wide text-violet-200 uppercase">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Preview */}
        <div className="mx-5 mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-5 min-h-[56px] flex items-center justify-center">
          <div ref={previewRef} className="text-violet-100 [&_.katex]:text-[1.4em]" />
        </div>

        {/* Editor fields */}
        <div className="px-5 py-4 space-y-3">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.06] bg-black/10">
          {isInsert ? (
            <div />
          ) : (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
            >
              Remover
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-[13px] text-text-secondary hover:text-text-primary hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className="px-5 py-1.5 text-[13px] font-semibold bg-violet-500 text-white rounded-lg hover:bg-violet-400 transition-colors shadow-lg shadow-violet-500/20"
            >
              {isInsert ? 'Inserir' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared field components ──────────────────────────────────────

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-widest text-violet-300/70 mb-1.5">
      {children}
    </label>
  )
}

// ─── Nested component snippets ────────────────────────────────────

const NESTED_SNIPPETS = [
  { label: 'Fração', latex: '\\frac{a}{b}' },
  { label: 'Raiz', latex: '\\sqrt{x}' },
  { label: 'Raiz n', latex: '\\sqrt[n]{x}' },
  { label: 'Sobrescrito', latex: 'x^{2}' },
  { label: 'Subscrito', latex: 'x_{i}' },
  { label: 'Integral', latex: '\\int_{a}^{b} f(x) \\, dx' },
  { label: 'Somatório', latex: '\\sum_{i=1}^{n} a_i' },
  { label: 'Limite', latex: '\\lim_{x \\to \\infty} f(x)' },
  { label: 'Parcial', latex: '\\frac{\\partial f}{\\partial x}' },
] as const

function SnippetPreview({ latex }: { latex: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      katex.render(latex, ref.current, { throwOnError: false, displayMode: false, macros: { ...katexMacros }, errorColor: '#7a6299' })
    } catch {
      ref.current.textContent = latex
    }
  }, [latex])
  return <span ref={ref} className="[&_.katex]:text-[0.85em]" />
}

export function FieldInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  onKeyDown,
  mono = true,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent) => void
  mono?: boolean
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [nestedEditorOpen, setNestedEditorOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Detect if value is a recognized math component
  const trimmed = value.trim()
  const mathType = trimmed.length > 0 ? detectMathType(trimmed) : 'generic'
  const isNestedComponent = mathType !== 'generic'

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  function insertSnippet(latex: string) {
    const input = inputRef.current
    if (!input) {
      onChange(value + latex)
    } else {
      const start = input.selectionStart ?? value.length
      const end = input.selectionEnd ?? value.length
      const next = value.slice(0, start) + latex + value.slice(end)
      onChange(next)
      // Restore cursor after the inserted snippet
      requestAnimationFrame(() => {
        const pos = start + latex.length
        input.setSelectionRange(pos, pos)
        input.focus()
      })
    }
    setPickerOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex gap-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-violet-100 placeholder:text-violet-100/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all ${
            mono ? 'font-mono' : ''
          }`}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(!pickerOpen)}
          title="Inserir componente"
          className={`flex-shrink-0 w-8 h-auto rounded-lg border text-[11px] font-bold transition-all ${
            pickerOpen
              ? 'bg-violet-500/20 border-violet-500/40 text-violet-200'
              : 'bg-black/20 border-white/[0.08] text-violet-400/60 hover:text-violet-300 hover:border-white/[0.14]'
          }`}
        >
          f<sub className="text-[9px]">x</sub>
        </button>
      </div>

      {/* Nested component preview — click to edit via specialized modal */}
      {isNestedComponent && (
        <button
          type="button"
          onClick={() => setNestedEditorOpen(true)}
          className="mt-1.5 w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all cursor-pointer group"
        >
          <SnippetPreview latex={value} />
          <span className="ml-auto flex items-center gap-1 text-[10px] text-violet-400/50 group-hover:text-violet-300 transition-colors font-medium">
            <Pencil size={10} />
            Editar componente
          </span>
        </button>
      )}

      {/* Nested component editor modal */}
      {nestedEditorOpen && (
        <Suspense fallback={null}>
          {/* Stop propagation so Escape only closes the nested modal, not the parent */}
          <div onKeyDown={(e) => e.stopPropagation()}>
            <LazyMathEditRouter
              initialLatex={value}
              onSave={(newLatex) => {
                onChange(newLatex)
                setNestedEditorOpen(false)
              }}
              onDelete={() => {
                onChange('')
                setNestedEditorOpen(false)
              }}
              onClose={() => setNestedEditorOpen(false)}
            />
          </div>
        </Suspense>
      )}

      {/* Snippet picker dropdown */}
      {pickerOpen && (
        <div
          ref={pickerRef}
          className="absolute right-0 top-9 mt-1.5 z-50 bg-[#1e1334] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 py-1.5 w-56 max-h-64 overflow-auto"
        >
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-violet-400/40">
            Inserir componente
          </div>
          {NESTED_SNIPPETS.map((s) => (
            <button
              key={s.label}
              onClick={() => insertSnippet(s.latex)}
              className="w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-white/[0.05] transition-colors"
            >
              <span className="text-[12px] text-violet-200/70">{s.label}</span>
              <SnippetPreview latex={s.latex} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}
