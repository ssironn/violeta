import { useState, useRef, useEffect } from 'react'
import katex from 'katex'
import { katexMacros } from '../../latex/katexMacros'

interface CustomMathInputProps {
  onInsert: (latex: string) => void
}

export function CustomMathInput({ onInsert }: CustomMathInputProps) {
  const [value, setValue] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

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

  function handleInsert() {
    if (!value.trim()) return
    onInsert(value)
    setValue('')
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-text-muted font-medium uppercase tracking-wider">
        LaTeX personalizado
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInsert()}
          placeholder="Ex: \int_0^1 x^2 dx"
          className="flex-1 bg-surface-bg border border-surface-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent font-mono"
        />
        <button
          onClick={handleInsert}
          disabled={!value.trim()}
          className="px-3 py-1.5 bg-accent text-white text-sm rounded-md hover:bg-accent-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Inserir
        </button>
      </div>
      {value.trim() && (
        <div className="bg-surface-bg border border-surface-border rounded-md p-3 min-h-[40px] flex items-center justify-center">
          <div ref={previewRef} className="text-text-primary" />
        </div>
      )}
    </div>
  )
}
