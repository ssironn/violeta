import { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import { FileText, ChevronLeft, Plus, Trash2, Share2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { DocumentListItem } from '../../api/documents'

interface SidebarProps {
  editor: Editor
  collapsed: boolean
  onToggle: () => void
  documents: DocumentListItem[]
  currentDocId: string | null
  onSelectDocument: (id: string) => void
  onCreateDocument: () => void
  onDeleteDocument: (id: string) => void
  onShareDocument?: (id: string) => void
}

interface HeadingItem {
  id: string
  text: string
  level: number
  pos: number
}

export function Sidebar({
  editor,
  collapsed,
  onToggle,
  documents,
  currentDocId,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  onShareDocument,
}: SidebarProps) {
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
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-border">
        <div className="flex items-center gap-2 text-text-secondary">
          <FileText size={16} />
          <span className="text-xs font-medium uppercase tracking-wider">Documentos</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
          title="Recolher sumário"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Documents section */}
      <div className="flex flex-col border-b border-surface-border">
        <button
          onClick={onCreateDocument}
          className="flex items-center gap-2 px-3 py-2 text-xs text-accent hover:bg-surface-hover transition-colors"
        >
          <Plus size={14} />
          <span>Novo documento</span>
        </button>
        <div className="overflow-auto max-h-48 px-2 pb-2">
          {documents.length === 0 ? (
            <p className="text-xs text-text-muted px-2 py-2">
              Nenhum documento ainda.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {documents.map((doc) => (
                <li key={doc.id} className="group relative">
                  <button
                    onClick={() => onSelectDocument(doc.id)}
                    className={clsx(
                      'w-full text-left px-2 py-1.5 rounded text-sm truncate transition-colors pr-12',
                      currentDocId === doc.id
                        ? 'bg-surface-hover text-text-primary font-medium'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    )}
                    title={doc.title}
                  >
                    {doc.title || 'Untitled'}
                  </button>
                  {onShareDocument && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onShareDocument(doc.id)
                      }}
                      className="absolute right-6 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover text-text-muted hover:text-accent transition-all"
                      title="Compartilhar documento"
                    >
                      <Share2 size={12} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteDocument(doc.id)
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-text-muted hover:text-red-500 transition-all"
                    title="Excluir documento"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Outline section */}
      <div className="flex items-center gap-2 px-3 py-2 text-text-secondary border-b border-surface-border">
        <span className="text-xs font-medium uppercase tracking-wider">Sumário</span>
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
