import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Calendar } from 'lucide-react'
import { type PublicPublication, getPublicPublication } from '../../api/publications'

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

export function PublicPublicationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [pub, setPub] = useState<PublicPublication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) return
    getPublicPublication(token)
      .then(setPub)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !pub) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface-bg gap-4">
        <p className="text-text-secondary">Publicação não encontrada.</p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-accent-400 hover:text-accent-500 transition-colors"
        >
          Ir para Violeta
        </button>
      </div>
    )
  }

  const initial = pub.author_name.charAt(0).toUpperCase()
  const formattedDate = new Date(pub.created_at).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="pub-page">
        {/* Top bar */}
        <div className="pub-topbar">
          <button
            onClick={() => navigate('/')}
            className="font-serif text-lg text-accent-400 hover:text-accent-300 transition-colors tracking-wide"
          >
            Violeta
          </button>
          <button
            onClick={() => navigate('/signin')}
            className="px-4 py-1.5 text-[13px] font-semibold bg-accent-500 text-white rounded-full hover:bg-accent-400 transition-colors"
          >
            Entrar
          </button>
        </div>

        {/* Header */}
        <div className="pub-header">
          <div className="pub-type-line">
            <span className="font-serif text-sm">{TYPE_ICONS[pub.type]}</span>
            <span>{TYPE_LABELS[pub.type]}</span>
          </div>
          <h1 className="pub-title">{pub.title}</h1>
          <div className="pub-meta">
            <div className="flex items-center gap-1.5">
              <div className="pub-author-avatar">{initial}</div>
              <span>{pub.author_name}</span>
            </div>
            <span className="text-text-muted">·</span>
            <span className="flex items-center gap-1 text-text-muted">
              <Calendar size={13} />
              {formattedDate}
            </span>
          </div>
          {pub.abstract && <p className="pub-abstract">{pub.abstract}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <Heart size={14} /> {pub.like_count}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle size={14} /> {pub.comment_count}
            </span>
          </div>
        </div>

        {/* PDF */}
        <div className="pub-pdf-container" style={{ marginBottom: '2rem' }}>
          <iframe
            src={`/api/publications/${pub.id}/pdf`}
            title={pub.title}
            style={{ height: '80vh' }}
          />
        </div>

        {/* CTA */}
        <div className="text-center py-8 border-t border-surface-border">
          <p className="text-sm text-text-secondary mb-4 font-serif text-lg">
            Entre no Violeta para curtir, comentar e publicar.
          </p>
          <button
            onClick={() => navigate('/signin')}
            className="px-7 py-2.5 bg-accent-500 text-white rounded-full hover:bg-accent-400 transition-colors text-sm font-semibold"
          >
            Criar conta grátis
          </button>
        </div>
      </div>
    </div>
  )
}
