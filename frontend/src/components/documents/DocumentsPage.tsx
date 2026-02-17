import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, FileText, Clock, Trash2, Loader2, Search, SortAsc, SortDesc, LayoutGrid, List } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import katex from 'katex'
import { listDocuments, getDocument, createDocument, deleteDocument } from '../../api/documents'
import type { DocumentListItem } from '../../api/documents'
import { katexMacros } from '../../latex/katexMacros'
import { parseLatex } from '../../latex/parseLatex'

interface PreviewSegment {
  type: 'text' | 'math'
  value: string
  displayMode?: boolean
}

interface PreviewLine {
  segments: PreviewSegment[]
}

function extractPreviewLines(content: Record<string, any>, maxLines = 6): PreviewLine[] {
  const lines: PreviewLine[] = []

  function walkInline(node: any, segments: PreviewSegment[]) {
    if (!node) return
    if (node.type === 'text' && node.text) {
      segments.push({ type: 'text', value: node.text })
      return
    }
    if ((node.type === 'inlineMath' || node.type === 'blockMath') && node.attrs?.latex) {
      segments.push({ type: 'math', value: node.attrs.latex, displayMode: node.type === 'blockMath' })
      return
    }
    if (node.content) {
      for (const child of node.content) walkInline(child, segments)
    }
  }

  function walk(node: any) {
    if (lines.length >= maxLines) return
    if (!node) return

    if (node.type === 'paragraph' || node.type === 'heading') {
      const segments: PreviewSegment[] = []
      if (node.content) {
        for (const child of node.content) walkInline(child, segments)
      }
      if (segments.length > 0) lines.push({ segments })
      return
    }
    if (node.type === 'rawLatex' && node.attrs?.content) {
      let latex = node.attrs.content.trim()
      if (latex.startsWith('$$') && latex.endsWith('$$')) {
        latex = latex.slice(2, -2)
        lines.push({ segments: [{ type: 'math', value: latex, displayMode: true }] })
      } else if (latex.startsWith('$') && latex.endsWith('$')) {
        latex = latex.slice(1, -1)
        lines.push({ segments: [{ type: 'math', value: latex, displayMode: false }] })
      } else {
        lines.push({ segments: [{ type: 'math', value: latex, displayMode: true }] })
      }
      return
    }
    if (node.type === 'mathEnvironment' && node.attrs?.latex) {
      lines.push({ segments: [{ type: 'math', value: node.attrs.latex, displayMode: true }] })
      return
    }
    if (node.type === 'latexTable') {
      lines.push({ segments: [{ type: 'text', value: '[Tabela]' }] })
      return
    }
    if (node.type === 'calloutBlock') {
      const label = node.attrs?.calloutType || 'Ambiente'
      lines.push({ segments: [{ type: 'text', value: `[${label.charAt(0).toUpperCase() + label.slice(1)}]` }] })
      if (node.content) {
        for (const child of node.content) walk(child)
      }
      return
    }
    if (node.content) {
      for (const child of node.content) walk(child)
    }
  }

  if (content?.content) {
    for (const node of content.content) {
      if (lines.length >= maxLines) break
      walk(node)
    }
  }

  return lines
}

function PreviewRenderer({ lines }: { lines: PreviewLine[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''

    for (const line of lines) {
      const p = document.createElement('div')
      p.className = 'doc-card-preview-line'

      for (const seg of line.segments) {
        if (seg.type === 'text') {
          const span = document.createElement('span')
          span.textContent = seg.value
          p.appendChild(span)
        } else {
          const span = document.createElement('span')
          span.className = 'doc-card-preview-math'
          try {
            katex.render(seg.value, span, {
              displayMode: seg.displayMode ?? false,
              throwOnError: false,
              errorColor: '#7a6299',
              macros: katexMacros,
            })
          } catch {
            span.textContent = seg.value
          }
          p.appendChild(span)
        }
      }

      ref.current.appendChild(p)
    }
  }, [lines])

  return <div ref={ref} className="doc-card-preview-rendered" />
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Agora mesmo'
    if (diffMin < 60) return `${diffMin}min atrás`
    if (diffHr < 24) return `${diffHr}h atrás`
    if (diffDay < 7) return `${diffDay}d atrás`
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

type SortMode = 'recent' | 'oldest' | 'name'
type ViewLayout = 'grid' | 'list'

function DocumentCard({
  doc,
  index,
  onOpen,
  onDelete,
  layout,
}: {
  doc: DocumentListItem
  index: number
  onOpen: () => void
  onDelete: () => void
  layout: ViewLayout
}) {
  const [previewLines, setPreviewLines] = useState<PreviewLine[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    getDocument(doc.id)
      .then(full => {
        const content = full.content as Record<string, any>
        if (content?.type === 'latex' && typeof content.source === 'string') {
          const parsed = parseLatex(content.source)
          setPreviewLines(extractPreviewLines(parsed))
        } else {
          setPreviewLines(extractPreviewLines(content))
        }
      })
      .catch(() => setPreviewLines([]))
      .finally(() => setLoadingPreview(false))
  }, [doc.id])

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete()
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  if (layout === 'list') {
    return (
      <div
        onClick={onOpen}
        onMouseLeave={() => setConfirmDelete(false)}
        className="docs-list-row group"
        style={{ animationDelay: `${index * 30}ms` }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      >
        <div className="docs-list-row-icon">
          <FileText size={16} />
        </div>
        <div className="docs-list-row-info">
          <span className="docs-list-row-title">{doc.title || 'Sem título'}</span>
          <span className="docs-list-row-meta">
            <Clock size={10} />
            {formatDate(doc.updated_at)}
            <span className="docs-list-row-badge">{doc.is_public ? 'Público' : 'Privado'}</span>
          </span>
        </div>
        <button
          onClick={handleDelete}
          className={`docs-list-row-delete ${confirmDelete ? 'docs-list-row-delete--confirm' : ''}`}
          title={confirmDelete ? 'Clique para confirmar' : 'Excluir documento'}
        >
          <Trash2 size={13} />
          {confirmDelete && <span>Confirmar</span>}
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={onOpen}
      onMouseLeave={() => setConfirmDelete(false)}
      className="doc-card group"
      style={{ animationDelay: `${index * 40}ms` }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      <div className="doc-card-accent" />
      <div className="doc-card-body">
        <div className="doc-card-header">
          <div className="doc-card-icon">
            <FileText size={16} />
          </div>
          <span className="doc-card-date">
            <Clock size={10} />
            {formatDate(doc.updated_at)}
          </span>
        </div>
        <h3 className="doc-card-title">{doc.title || 'Sem título'}</h3>
        <div className="doc-card-preview doc-card-preview--visible">
          <div className="doc-card-preview-paper">
            {loadingPreview ? (
              <div className="doc-card-preview-loading">
                <Loader2 size={14} className="animate-spin" />
              </div>
            ) : previewLines && previewLines.length > 0 ? (
              <PreviewRenderer lines={previewLines} />
            ) : (
              <p className="doc-card-preview-empty">Documento vazio</p>
            )}
          </div>
        </div>
      </div>
      <div className="doc-card-footer">
        <span className="doc-card-footer-label">{doc.is_public ? 'Público' : 'Privado'}</span>
        <button
          onClick={handleDelete}
          className={`doc-card-delete ${confirmDelete ? 'doc-card-delete--confirm' : ''}`}
          title={confirmDelete ? 'Clique para confirmar' : 'Excluir documento'}
        >
          <Trash2 size={13} />
          {confirmDelete && <span>Confirmar</span>}
        </button>
      </div>
    </div>
  )
}

export function DocumentsPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')
  const [layout, setLayout] = useState<ViewLayout>('grid')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = useCallback(async () => {
    if (creating) return
    setCreating(true)
    try {
      const doc = await createDocument()
      navigate(`/document/${doc.id}`)
    } catch (err) {
      console.error(err)
      setCreating(false)
    }
  }, [creating, navigate])

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = documents.filter(d =>
    (d.title || 'Sem título').toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'recent') return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    if (sort === 'oldest') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
    return (a.title || '').localeCompare(b.title || '')
  })

  return (
    <main className="docs-page">
      <div className="docs-page-header">
        <div className="docs-page-title-row">
          <h1 className="docs-page-title">Meus Documentos</h1>
          <span className="docs-page-count">{documents.length}</span>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="docs-page-create-btn"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          <span>Novo documento</span>
        </button>
      </div>

      <div className="docs-page-controls">
        <div className="docs-page-search">
          <Search size={15} className="docs-page-search-icon" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="docs-page-search-input"
          />
        </div>
        <div className="docs-page-actions">
          <button
            onClick={() => setSort(s => s === 'recent' ? 'oldest' : s === 'oldest' ? 'name' : 'recent')}
            className="docs-page-sort-btn"
            title={sort === 'recent' ? 'Mais recentes' : sort === 'oldest' ? 'Mais antigos' : 'Por nome'}
          >
            {sort === 'oldest' ? <SortDesc size={15} /> : <SortAsc size={15} />}
            <span className="hidden sm:inline">
              {sort === 'recent' ? 'Recentes' : sort === 'oldest' ? 'Antigos' : 'A-Z'}
            </span>
          </button>
          <div className="docs-page-layout-toggle">
            <button
              onClick={() => setLayout('grid')}
              className={`docs-page-layout-btn ${layout === 'grid' ? 'docs-page-layout-btn--active' : ''}`}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setLayout('list')}
              className={`docs-page-layout-btn ${layout === 'list' ? 'docs-page-layout-btn--active' : ''}`}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="home-loading">
          <Loader2 size={28} className="animate-spin text-accent-400" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="docs-page-empty">
          <FileText size={40} strokeWidth={1} />
          <p>{search ? 'Nenhum documento encontrado' : 'Nenhum documento ainda'}</p>
          {!search && (
            <button onClick={handleCreate} className="docs-page-empty-btn">
              <Plus size={16} />
              Criar primeiro documento
            </button>
          )}
        </div>
      ) : layout === 'grid' ? (
        <div className="home-grid">
          {sorted.map((doc, i) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              index={i}
              layout="grid"
              onOpen={() => navigate(`/document/${doc.id}`)}
              onDelete={() => handleDelete(doc.id)}
            />
          ))}
        </div>
      ) : (
        <div className="docs-list">
          {sorted.map((doc, i) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              index={i}
              layout="list"
              onOpen={() => navigate(`/document/${doc.id}`)}
              onDelete={() => handleDelete(doc.id)}
            />
          ))}
        </div>
      )}
    </main>
  )
}
