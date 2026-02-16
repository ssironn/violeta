import { useRef, useEffect } from 'react'
import katex from 'katex'
import { katexMacros } from '../../latex/katexMacros'
import type { MathTemplate } from '../../extensions/mathTemplates'

interface MathTemplateCardProps {
  template: MathTemplate
  onClick: (latex: string) => void
}

export function MathTemplateCard({ template, onClick }: MathTemplateCardProps) {
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (previewRef.current) {
      try {
        katex.render(template.latex, previewRef.current, {
          throwOnError: false,
          displayMode: false,
          macros: { ...katexMacros },
          errorColor: '#7a6299',
        })
      } catch {
        previewRef.current.textContent = template.latex
      }
    }
  }, [template.latex])

  return (
    <button
      onClick={() => onClick(template.latex)}
      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-surface-border bg-surface-panel hover:bg-surface-hover hover:border-accent-700 transition-colors cursor-pointer group"
      title={template.label}
    >
      <div
        ref={previewRef}
        className="text-text-primary min-h-[28px] flex items-center justify-center"
      />
      <span className="text-xs text-text-muted group-hover:text-text-secondary truncate w-full text-center">
        {template.label}
      </span>
    </button>
  )
}
