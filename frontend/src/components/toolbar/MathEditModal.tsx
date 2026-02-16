import { useState, useRef, useEffect } from 'react'
import katex from 'katex'
import { X } from 'lucide-react'
import { katexMacros } from '../../latex/katexMacros'

interface MathEditModalProps {
  initialLatex: string
  onSave: (latex: string) => void
  onDelete: () => void
  onClose: () => void
}

export function MathEditModal({
  initialLatex,
  onSave,
  onDelete,
  onClose,
}: MathEditModalProps) {
  const [value, setValue] = useState(initialLatex)
  const previewRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    if (previewRef.current) {
      if (!value.trim()) {
        previewRef.current.textContent = ''
        return
      }
      try {
        katex.render(value, previewRef.current, {
          throwOnError: false,
          displayMode: true,
          macros: { ...katexMacros },
          errorColor: '#7a6299',
        })
      } catch {
        previewRef.current.textContent = value
      }
    }
  }, [value])

  function handleSave() {
    if (!value.trim()) return
    onSave(value)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface-elevated border border-surface-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
          <h3 className="text-sm font-medium text-text-primary">
            Editar expressão matemática
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-surface-bg border border-surface-border rounded-lg p-4 min-h-[60px] flex items-center justify-center">
            <div ref={previewRef} className="text-text-primary" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="LaTeX..."
            className="w-full bg-surface-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent font-mono"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
            >
              Remover
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!value.trim()}
                className="px-4 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
