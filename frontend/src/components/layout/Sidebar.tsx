import { useState, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import { FileText, ChevronLeft, Plus, Trash2, Share2, LogOut, Home } from 'lucide-react'
import { clsx } from 'clsx'
import type { DocumentListItem } from '../../api/documents'
import { useAuth } from '../../contexts/AuthContext'

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
  onGoHome?: () => void
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
  onGoHome,
}: SidebarProps) {
  const { user, logout } = useAuth()
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
    <div className="hidden md:flex w-56 bg-surface-panel border-r border-surface-border flex-col flex-shrink-0 animate-slide-in-left">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-accent-400 transition-colors"
              title="Voltar ao início"
            >
              <Home size={14} />
            </button>
          )}
          <h1 className="font-serif text-lg font-medium text-text-primary tracking-wide">
            Violeta
          </h1>
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
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-muted">
            Documentos
          </span>
          <button
            onClick={onCreateDocument}
            className="p-1 rounded hover:bg-accent-600/20 text-text-muted hover:text-accent-400 transition-colors"
            title="Novo documento"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="overflow-auto max-h-48 px-2 pb-2">
          {documents.length === 0 ? (
            <p className="text-xs text-text-muted px-2 py-3 italic">
              Nenhum documento ainda.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {documents.map((doc) => (
                <li key={doc.id} className="group relative">
                  <button
                    onClick={() => onSelectDocument(doc.id)}
                    className={clsx(
                      'w-full text-left px-2.5 py-1.5 rounded-md text-sm truncate transition-all pr-14',
                      currentDocId === doc.id
                        ? 'bg-accent-600/15 text-accent-300 border-l-2 border-accent-500'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary border-l-2 border-transparent'
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
                      className="absolute right-7 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-hover text-text-muted hover:text-accent-400 transition-all"
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
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all"
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
      <div className="flex items-center gap-2 px-4 py-2 text-text-secondary">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-muted">Sumário</span>
      </div>
      <nav className="flex-1 overflow-auto px-2 pb-2">
        {headings.length === 0 ? (
          <p className="text-xs text-text-muted px-2 py-4 italic">
            Adicione títulos ao documento para ver o sumário aqui.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {headings.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => scrollToHeading(h.pos)}
                  className={clsx(
                    'w-full text-left px-2.5 py-1 rounded-md text-sm truncate transition-colors',
                    'hover:bg-surface-hover text-text-secondary hover:text-text-primary',
                    h.level === 1 && 'font-medium',
                    h.level === 2 && 'pl-5',
                    h.level === 3 && 'pl-8 text-xs',
                    h.level === 4 && 'pl-10 text-xs'
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

      {/* User footer */}
      {user && (
        <div className="border-t border-surface-border px-3 py-2.5 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-500 to-gold/80 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-xs text-text-secondary truncate flex-1">{user.name}</span>
          <button
            onClick={logout}
            className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-red-400 transition-colors"
            title="Sair"
          >
            <LogOut size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
