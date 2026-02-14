import { useState, useEffect } from 'react'
import { Plus, FileText, Clock, Trash2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listDocuments, getDocument, createDocument, deleteDocument } from '../../api/documents'
import type { DocumentListItem } from '../../api/documents'
import { useAuth } from '../../contexts/AuthContext'

function extractPreviewText(content: Record<string, any>): string {
  const lines: string[] = []

  function walk(node: any) {
    if (lines.length >= 4) return
    if (!node) return
    if (node.type === 'text' && node.text) {
      lines[lines.length - 1] = (lines[lines.length - 1] || '') + node.text
      return
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      lines.push('')
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

  return lines.filter(l => l.trim()).slice(0, 4).join('\n') || ''
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
  const [preview, setPreview] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Eagerly load preview on mount
  useEffect(() => {
    getDocument(doc.id)
      .then(full => setPreview(extractPreviewText(full.content)))
      .catch(() => setPreview(''))
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
          ) : preview ? (
            <p className="doc-card-preview-text">{preview}</p>
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
          <Loader2 size={28} className="animate-spin text-violet-400" />
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

export function HomeScreen() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [loading, setLoading] = useState(true)

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

  async function handleDelete(id: string) {
    try {
      await deleteDocument(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })()

  return (
    <div className="home-screen">
      {/* Ambient background */}
      <div className="home-bg" />

      {/* Header */}
      <header className="home-header">
        <div className="home-header-left">
          <h1 className="home-logo">Violeta</h1>
          <span className="home-divider" />
          <span className="home-greeting">
            {greeting}, <strong>{user?.name?.split(' ')[0]}</strong>
          </span>
        </div>
        <button onClick={logout} className="home-logout">
          Sair
        </button>
      </header>

      {/* Content */}
      <main className="home-content">
        <div className="home-section-header">
          <h2 className="home-section-title">Seus documentos</h2>
          <span className="home-section-count">
            {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
          </span>
        </div>

        {loading ? (
          <div className="home-loading">
            <Loader2 size={28} className="animate-spin text-violet-400" />
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
    </div>
  )
}
