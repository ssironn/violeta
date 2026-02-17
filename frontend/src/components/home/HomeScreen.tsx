import { useState, useEffect, useRef } from 'react'
import { Plus, FileText, Clock, Trash2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import katex from 'katex'
import { listDocuments, getDocument, createDocument, deleteDocument } from '../../api/documents'
import type { DocumentListItem } from '../../api/documents'
import { katexMacros } from '../../latex/katexMacros'
import { parseLatex } from '../../latex/parseLatex'
import { documentTemplates, templateCategories } from '../../data/documentTemplates'
import type { DocumentTemplate } from '../../data/documentTemplates'

interface PreviewSegment {
  type: 'text' | 'math'
  value: string
  displayMode?: boolean
}

interface PreviewLine {
  segments: PreviewSegment[]
}

function extractPreviewLines(content: Record<string, any>): PreviewLine[] {
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
    if (lines.length >= 4) return
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
      // Strip $ delimiters for rendering
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
      if (lines.length >= 4) break
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

function DocumentCard({
  doc,
  index,
  onOpen,
  onDelete,
}: {
  doc: DocumentListItem
  index: number
  onOpen: () => void
  onDelete: () => void
}) {
  const [previewLines, setPreviewLines] = useState<PreviewLine[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [_hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Eagerly load preview on mount
  useEffect(() => {
    getDocument(doc.id)
      .then(full => {
        const content = full.content as Record<string, any>
        if (content?.type === 'latex' && typeof content.source === 'string') {
          // New format: parse LaTeX to get TipTap JSON, then extract preview
          const parsed = parseLatex(content.source)
          setPreviewLines(extractPreviewLines(parsed))
        } else {
          setPreviewLines(extractPreviewLines(content))
        }
      })
      .catch(() => setPreviewLines([]))
      .finally(() => setLoadingPreview(false))
  }, [doc.id])

  function handleMouseEnter() {
    setHovered(true)
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirmDelete) {
      onDelete()
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div
      onClick={onOpen}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
      className="doc-card group"
      style={{ animationDelay: `${index * 60}ms` }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      {/* Top accent line */}
      <div className="doc-card-accent" />

      {/* Content */}
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

        <h3 className="doc-card-title">
          {doc.title || 'Sem título'}
        </h3>

        {/* Preview area — always visible */}
        <div className="doc-card-preview doc-card-preview--visible">
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

      {/* Footer */}
      <div className="doc-card-footer">
        <span className="doc-card-footer-label">
          {doc.is_public ? 'Público' : 'Privado'}
        </span>
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

function NewDocumentCard({ onCreate, index }: { onCreate: () => void; index: number }) {
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (creating) return
    setCreating(true)
    await onCreate()
    setCreating(false)
  }

  return (
    <button
      onClick={handleCreate}
      disabled={creating}
      className="new-doc-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="new-doc-card-inner">
        {creating ? (
          <Loader2 size={28} className="animate-spin text-accent-400" />
        ) : (
          <>
            <div className="new-doc-card-icon">
              <Plus size={24} strokeWidth={1.5} />
            </div>
            <span className="new-doc-card-label">Novo documento</span>
          </>
        )}
      </div>
    </button>
  )
}

function TemplateCard({
  template,
  onClick,
  creating,
}: {
  template: DocumentTemplate
  onClick: () => void
  creating: boolean
}) {
  const Icon = template.icon

  return (
    <button
      onClick={onClick}
      disabled={creating}
      className="template-card"
    >
      <div className="template-card-icon">
        {creating ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
      </div>
      <div className="template-card-info">
        <span className="template-card-title">{template.title}</span>
        <span className="template-card-desc">{template.description}</span>
      </div>
    </button>
  )
}

export function HomeScreen() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null)

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    try {
      const doc = await createDocument()
      navigate(`/document/${doc.id}`)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreateFromTemplate(template: DocumentTemplate) {
    if (creatingTemplateId) return
    setCreatingTemplateId(template.id)
    try {
      const content = { type: 'latex', source: template.latexSource }
      const doc = await createDocument(template.title, content)
      navigate(`/document/${doc.id}`)
    } catch (err) {
      console.error(err)
      setCreatingTemplateId(null)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Templates section */}
      <div className="home-section-header">
        <h2 className="home-section-title">Começar com um template</h2>
      </div>

      <div className="templates-section">
        {templateCategories.map(cat => {
          const templates = documentTemplates.filter(t => t.category === cat.id)
          if (templates.length === 0) return null
          return (
            <div key={cat.id} className="template-category">
              <h3 className="template-category-label">{cat.label}</h3>
              <div className="template-category-grid">
                {templates.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onClick={() => handleCreateFromTemplate(t)}
                    creating={creatingTemplateId === t.id}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Documents section */}
      <div className="home-section-header" style={{ marginTop: '2rem' }}>
        <h2 className="home-section-title">Seus documentos</h2>
        <span className="home-section-count">
          {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
        </span>
      </div>

      {loading ? (
        <div className="home-loading">
          <Loader2 size={28} className="animate-spin text-accent-400" />
        </div>
      ) : (
        <div className="home-grid">
          <NewDocumentCard onCreate={handleCreate} index={0} />
          {documents.map((doc, i) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              index={i + 1}
              onOpen={() => navigate(`/document/${doc.id}`)}
              onDelete={() => handleDelete(doc.id)}
            />
          ))}
        </div>
      )}
    </main>
  )
}
