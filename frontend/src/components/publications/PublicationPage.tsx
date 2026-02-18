import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, Share2, Trash2, ArrowLeft, Calendar } from 'lucide-react'
import { type PublicationItem, getPublication, getPdfUrl, toggleLike, deletePublication } from '../../api/publications'
import { CommentSection } from './CommentSection'
import { useAuth } from '../../contexts/AuthContext'

const TYPE_LABELS: Record<string, string> = {
  article: 'Artigo',
  exercise_list: 'Lista de Exercícios',
  study_material: 'Material de Estudo',
  proof: 'Demonstração',
}

const TYPE_ICONS: Record<string, string> = {
  article: '§',
  exercise_list: '∑',
  study_material: '∫',
  proof: '∴',
}

export function PublicationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pub, setPub] = useState<PublicationItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    getPublication(id)
      .then(setPub)
      .catch(() => navigate('/explore'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  async function handleLike() {
    if (!pub) return
    const result = await toggleLike(pub.id)
    setPub({ ...pub, liked_by_me: result.liked, like_count: result.like_count })
  }

  async function handleDelete() {
    if (!pub || !confirm('Tem certeza que deseja excluir esta publicação?')) return
    await deletePublication(pub.id)
    navigate('/explore')
  }

  function handleShare() {
    if (!pub) return
    navigator.clipboard.writeText(`${window.location.origin}/p/${pub.share_token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading || !pub) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isAuthor = user?.id === pub.author_id
  const initial = pub.author_name.charAt(0).toUpperCase()
  const formattedDate = new Date(pub.created_at).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="pub-page">
      {/* Top bar */}
      <div className="pub-topbar">
        <button onClick={() => navigate(-1)} className="pub-back-btn">
          <ArrowLeft size={16} />
          Voltar
        </button>
        <div className="pub-actions">
          <button
            onClick={handleLike}
            className={`pub-action-btn ${pub.liked_by_me ? 'liked' : ''}`}
          >
            <Heart size={14} className={pub.liked_by_me ? 'fill-current' : ''} />
            {pub.like_count}
          </button>
          <button onClick={handleShare} className="pub-action-btn">
            <Share2 size={14} />
            {copied ? 'Copiado!' : 'Compartilhar'}
          </button>
          {isAuthor && (
            <button onClick={handleDelete} className="pub-action-btn danger">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="pub-header">
        <div className="pub-type-line">
          <span className="font-serif text-sm">{TYPE_ICONS[pub.type]}</span>
          <span>{TYPE_LABELS[pub.type]}</span>
        </div>
        <h1 className="pub-title">{pub.title}</h1>
        <div className="pub-meta">
          <button
            onClick={() => navigate(`/profile/${pub.author_id}`)}
            className="pub-author-link"
          >
            <div className="pub-author-avatar">{initial}</div>
            {pub.author_name}
          </button>
          <span className="text-text-muted">·</span>
          <span className="flex items-center gap-1 text-text-muted">
            <Calendar size={13} />
            {formattedDate}
          </span>
        </div>
        {pub.abstract && <p className="pub-abstract">{pub.abstract}</p>}
      </div>

      {/* PDF Viewer */}
      <div className="pub-pdf-container">
        <iframe src={getPdfUrl(pub.id)} title={pub.title} />
      </div>

      {/* Comments */}
      <div className="pub-comments-section">
        <CommentSection publicationId={pub.id} />
      </div>
    </div>
  )
}
