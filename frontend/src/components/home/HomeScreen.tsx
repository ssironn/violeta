import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, FileText, Clock, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import katex from 'katex'
import { listDocuments, getDocument, createDocument } from '../../api/documents'
import type { DocumentListItem } from '../../api/documents'
import { katexMacros } from '../../latex/katexMacros'
import { parseLatex } from '../../latex/parseLatex'
import { documentTemplates, templateCategories } from '../../data/documentTemplates'
import type { DocumentTemplate } from '../../data/documentTemplates'
import { useAuth } from '../../contexts/AuthContext'

// ── Preview helpers (compact version for recent docs) ──

interface PreviewSegment {
  type: 'text' | 'math'
  value: string
  displayMode?: boolean
}

interface PreviewLine {
  segments: PreviewSegment[]
}

function extractPreviewLines(content: Record<string, any>, maxLines = 5): PreviewLine[] {
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

function MiniPreviewRenderer({ lines }: { lines: PreviewLine[] }) {
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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

// ── Recent Document Card (compact, horizontal) ──

function RecentDocCard({
  doc,
  index,
  onOpen,
}: {
  doc: DocumentListItem
  index: number
  onOpen: () => void
}) {
  const [previewLines, setPreviewLines] = useState<PreviewLine[] | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)

  useEffect(() => {
    getDocument(doc.id)
      .then(full => {
        const content = full.content as Record<string, any>
        if (content?.type === 'latex' && typeof content.source === 'string') {
          const parsed = parseLatex(content.source)
          setPreviewLines(extractPreviewLines(parsed, 5))
        } else {
          setPreviewLines(extractPreviewLines(content, 5))
        }
      })
      .catch(() => setPreviewLines([]))
      .finally(() => setLoadingPreview(false))
  }, [doc.id])

  return (
    <button
      onClick={onOpen}
      className="home-recent-card group"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="home-recent-card-accent" />
      <div className="home-recent-card-body">
        <div className="home-recent-card-top">
          <div className="home-recent-card-icon">
            <FileText size={14} />
          </div>
          <span className="home-recent-card-time">
            <Clock size={9} />
            {formatDate(doc.updated_at)}
          </span>
        </div>
        <h3 className="home-recent-card-title">{doc.title || 'Sem título'}</h3>
        <div className="home-recent-card-preview">
          <div className="doc-card-preview-paper">
            {loadingPreview ? (
              <div className="doc-card-preview-loading">
                <Loader2 size={12} className="animate-spin" />
              </div>
            ) : previewLines && previewLines.length > 0 ? (
              <MiniPreviewRenderer lines={previewLines} />
            ) : (
              <p className="doc-card-preview-empty">Documento vazio</p>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Template Card (redesigned for home) ──

function HomeTemplateCard({
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
      className="home-template-card"
    >
      <div className="home-template-card-icon">
        {creating ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
      </div>
      <div className="home-template-card-info">
        <span className="home-template-card-title">{template.title}</span>
        <span className="home-template-card-desc">{template.description}</span>
      </div>
    </button>
  )
}

// ── Main HomeScreen ──

export function HomeScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null)

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const recentDocs = documents
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6)

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

  const firstName = user?.name?.split(' ')[0] || ''

  return (
    <main className="home-page">
      {/* ── Ambient background ── */}
      <div className="home-page-bg" />

      {/* ── Hero greeting ── */}
      <section className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-hero-greeting">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="home-hero-subtitle">O que vamos escrever hoje?</p>
        </div>

        {/* Quick actions */}
        <div className="home-quick-actions">
          <button onClick={handleCreate} disabled={creating} className="home-quick-action home-quick-action--primary">
            {creating ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Plus size={20} strokeWidth={2} />
            )}
            <div className="home-quick-action-text">
              <span className="home-quick-action-label">Documento em branco</span>
              <span className="home-quick-action-hint">Comece do zero</span>
            </div>
          </button>
          <button onClick={() => document.getElementById('templates-section')?.scrollIntoView({ behavior: 'smooth' })} className="home-quick-action">
            <Sparkles size={20} strokeWidth={1.5} />
            <div className="home-quick-action-text">
              <span className="home-quick-action-label">Usar template</span>
              <span className="home-quick-action-hint">Artigos, provas, trabalhos</span>
            </div>
          </button>
        </div>
      </section>

      {/* ── Recent documents ── */}
      {!loading && recentDocs.length > 0 && (
        <section className="home-section">
          <div className="home-section-head">
            <h2 className="home-section-label">Documentos recentes</h2>
            <button
              onClick={() => navigate('/documents')}
              className="home-section-link"
            >
              Ver todos
              <ArrowRight size={13} />
            </button>
          </div>
          <div className="home-recent-grid">
            {recentDocs.map((doc, i) => (
              <RecentDocCard
                key={doc.id}
                doc={doc}
                index={i}
                onOpen={() => navigate(`/document/${doc.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {loading && (
        <div className="home-loading">
          <Loader2 size={24} className="animate-spin text-accent-400" />
        </div>
      )}

      {!loading && recentDocs.length === 0 && (
        <section className="home-empty-state">
          <div className="home-empty-state-inner">
            <FileText size={36} strokeWidth={1} className="text-text-muted" />
            <p className="home-empty-state-text">
              Nenhum documento ainda. Crie seu primeiro documento ou escolha um template abaixo.
            </p>
          </div>
        </section>
      )}

      {/* ── Templates ── */}
      <section className="home-section" id="templates-section">
        <div className="home-section-head">
          <h2 className="home-section-label">Templates</h2>
        </div>

        <div className="home-templates-grid">
          {templateCategories.map(cat => {
            const templates = documentTemplates.filter(t => t.category === cat.id)
            if (templates.length === 0) return null
            return (
              <div key={cat.id} className="home-template-category">
                <h3 className="home-template-category-label">{cat.label}</h3>
                <div className="home-template-category-items">
                  {templates.map(t => (
                    <HomeTemplateCard
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
      </section>
    </main>
  )
}
