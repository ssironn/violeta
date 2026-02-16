import { useEffect, useState, useRef } from 'react'
import type { Editor } from '@tiptap/core'
import { Plus } from 'lucide-react'
import katex from 'katex'
import { katexMacros } from '../../latex/katexMacros'
import { mathTemplates } from '../../extensions/mathTemplates'

interface Props {
  editor: Editor
  onOpenMathEditor: (latex: string) => void
  onOpenImageModal: () => void
  onOpenTikzEditor?: () => void
  onOpenPlotEditor?: () => void
}

function MiniPreview({ latex }: { latex: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      katex.render(latex, ref.current, { throwOnError: false, displayMode: false, macros: { ...katexMacros }, errorColor: '#7a6299' })
    } catch {
      ref.current.textContent = latex
    }
  }, [latex])
  return <span ref={ref} className="[&_.katex]:text-[0.75em] text-gray-500" />
}

export function BlockInsertMenu({ editor, onOpenMathEditor, onOpenImageModal, onOpenTikzEditor, onOpenPlotEditor }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [buttonPos, setButtonPos] = useState<{ top: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      if (!editor.isFocused) {
        return
      }

      const { selection } = editor.state
      const { $from } = selection

      try {
        // Get coordinates of the start of the current block
        const startPos = $from.start($from.depth)
        const coords = editor.view.coordsAtPos(startPos)

        // Get the editor DOM element position
        const editorRect = editor.view.dom.getBoundingClientRect()

        setButtonPos({
          top: coords.top - editorRect.top,
        })
      } catch {
        setButtonPos(null)
      }
    }

    update()
    editor.on('selectionUpdate', update)
    editor.on('focus', update)
    editor.on('blur', () => setButtonPos(null))

    return () => {
      editor.off('selectionUpdate', update)
      editor.off('focus', update)
      editor.off('blur', () => setButtonPos(null))
    }
  }, [editor])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  if (!buttonPos) return null

  const categories = [
    { key: 'basic', label: 'Básico' },
    { key: 'notation', label: 'Notação' },
    { key: 'calculus', label: 'Cálculo' },
    { key: 'algebra', label: 'Álgebra' },
  ] as const

  // Prevent clicks on the menu from blurring the editor
  const preventBlur = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div
      className="absolute z-30 pointer-events-auto"
      style={{ top: buttonPos.top, left: 24 }}
      onMouseDown={preventBlur}
    >
      <button
        ref={buttonRef}
        onClick={() => setMenuOpen(!menuOpen)}
        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
          menuOpen
            ? 'text-accent-600 bg-accent-500/15 rotate-45'
            : 'text-text-muted hover:text-accent-500 hover:bg-surface-hover'
        }`}
        title="Inserir componente"
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute left-0 top-8 z-50 bg-surface-elevated border border-surface-border rounded-xl shadow-xl shadow-accent-900/10 py-1.5 w-72 max-h-96 overflow-auto"
        >
          {/* Math templates by category */}
          {categories.map((cat) => {
            const templates = mathTemplates.filter((t) => t.category === cat.key)
            if (templates.length === 0) return null
            return (
              <div key={cat.key}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  {cat.label}
                </div>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onOpenMathEditor(t.latex)
                      setMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-surface-hover transition-colors"
                  >
                    <span className="text-[13px] text-text-primary">{t.label}</span>
                    <MiniPreview latex={t.latex} />
                  </button>
                ))}
              </div>
            )
          })}

          {/* Separator */}
          <div className="border-t border-surface-border my-1" />

          {/* Other insertable elements */}
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            Outros
          </div>
          <button
            onClick={() => {
              onOpenImageModal()
              setMenuOpen(false)
            }}
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-surface-hover transition-colors"
          >
            <span className="text-[13px] text-text-primary">Imagem</span>
          </button>
          {onOpenTikzEditor && (
            <button
              onClick={() => {
                onOpenTikzEditor()
                setMenuOpen(false)
              }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-surface-hover transition-colors"
            >
              <span className="text-[13px] text-text-primary">Figuras Geométricas</span>
            </button>
          )}
          {onOpenPlotEditor && (
            <button
              onClick={() => {
                onOpenPlotEditor()
                setMenuOpen(false)
              }}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-surface-hover transition-colors"
            >
              <span className="text-[13px] text-text-primary">Gráfico de Funções</span>
            </button>
          )}
          <button
            onClick={() => {
              editor.chain().focus().setHorizontalRule().run()
              setMenuOpen(false)
            }}
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-surface-hover transition-colors"
          >
            <span className="text-[13px] text-text-primary">Linha Horizontal</span>
          </button>
          <button
            onClick={() => {
              editor.chain().focus().toggleCodeBlock().run()
              setMenuOpen(false)
            }}
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-surface-hover transition-colors"
          >
            <span className="text-[13px] text-text-primary">Bloco de Código</span>
          </button>
        </div>
      )}
    </div>
  )
}
