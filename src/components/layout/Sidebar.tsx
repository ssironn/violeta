import { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import { FileText, ChevronLeft } from 'lucide-react'
import { clsx } from 'clsx'

interface SidebarProps {
  editor: Editor
  collapsed: boolean
  onToggle: () => void
}

interface HeadingItem {
  id: string
  text: string
  level: number
  pos: number
}

export function Sidebar({ editor, collapsed, onToggle }: SidebarProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([])

  const extractHeadings = useCallback(() => {
    const items: HeadingItem[] = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        items.push({
          id: `heading-${pos}`,
          text: node.textContent,
          level: node.attrs.level,
          pos,
        })
      }
    })
    setHeadings(items)
  }, [editor])

  useEffect(() => {
    extractHeadings()
    editor.on('update', extractHeadings)
    return () => {
      editor.off('update', extractHeadings)
    }
  }, [editor, extractHeadings])

  function scrollToHeading(pos: number) {
    editor.chain().focus().setTextSelection(pos + 1).run()
    const domEl = editor.view.domAtPos(pos + 1)
    const node = domEl.node instanceof HTMLElement ? domEl.node : domEl.node.parentElement
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="hidden md:flex w-10 bg-surface-panel border-r border-surface-border items-start justify-center pt-3 hover:bg-surface-hover transition-colors"
        title="Expandir sumário"
      >
        <FileText size={18} className="text-text-muted" />
      </button>
    )
  }

  return (
    <div className="hidden md:flex w-60 bg-surface-panel border-r border-surface-border flex-col flex-shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-border">
        <div className="flex items-center gap-2 text-text-secondary">
          <FileText size={16} />
          <span className="text-xs font-medium uppercase tracking-wider">Sumário</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          title="Recolher sumário"
        >
          <ChevronLeft size={14} />
        </button>
      </div>
      <nav className="flex-1 overflow-auto p-2">
        {headings.length === 0 ? (
          <p className="text-xs text-text-muted px-2 py-4">
            Adicione títulos ao documento para ver o sumário aqui.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {headings.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => scrollToHeading(h.pos)}
                  className={clsx(
                    'w-full text-left px-2 py-1 rounded text-sm truncate transition-colors',
                    'hover:bg-surface-hover text-text-secondary hover:text-text-primary',
                    h.level === 1 && 'font-semibold',
                    h.level === 2 && 'pl-4',
                    h.level === 3 && 'pl-6 text-xs',
                    h.level === 4 && 'pl-8 text-xs'
                  )}
                  title={h.text}
                >
                  {h.text || '(sem título)'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  )
}
