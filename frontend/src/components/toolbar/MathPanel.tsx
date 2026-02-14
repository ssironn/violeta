import type { Editor } from '@tiptap/core'
import { mathTemplates } from '../../extensions/mathTemplates'
import { MathTemplateCard } from './MathTemplateCard'
import { CustomMathInput } from './CustomMathInput'

interface MathPanelProps {
  editor: Editor
  onClose: () => void
  onOpenMathEditor: (latex: string) => void
}

export function MathPanel({ editor, onClose, onOpenMathEditor }: MathPanelProps) {
  function handleTemplateClick(latex: string) {
    onOpenMathEditor(latex)
  }

  function handleCustomInsert(latex: string) {
    // Custom input still inserts directly (it's already raw LaTeX the user typed)
    editor.chain().focus().insertContent({
      type: 'inlineMath',
      attrs: { latex },
    }).run()
    onClose()
  }

  const categories = [
    { key: 'basic', label: 'Básico' },
    { key: 'notation', label: 'Notação' },
    { key: 'calculus', label: 'Cálculo' },
    { key: 'algebra', label: 'Álgebra' },
  ] as const

  return (
    <div className="bg-surface-elevated border-b border-surface-border px-4 py-4 overflow-auto max-h-[350px]">
      <div className="max-w-5xl mx-auto space-y-4">
        {categories.map((cat) => {
          const templates = mathTemplates.filter((t) => t.category === cat.key)
          if (templates.length === 0) return null
          return (
            <div key={cat.key}>
              <h3 className="text-xs text-text-muted font-medium uppercase tracking-wider mb-2">
                {cat.label}
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {templates.map((t) => (
                  <MathTemplateCard
                    key={t.id}
                    template={t}
                    onClick={handleTemplateClick}
                  />
                ))}
              </div>
            </div>
          )
        })}
        <CustomMathInput onInsert={handleCustomInsert} />
      </div>
    </div>
  )
}
