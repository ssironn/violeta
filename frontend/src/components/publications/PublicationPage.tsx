import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, Share2, Trash2, ArrowLeft } from 'lucide-react'
import { type PublicationItem, getPublication, getPdfUrl, toggleLike, deletePublication } from '../../api/publications'
import { CommentSection } from './CommentSection'
import { useAuth } from '../../contexts/AuthContext'

const TYPE_LABELS: Record<string, string> = { article: 'Artigo', exercise_list: 'Lista de Exercicios', study_material: 'Material de Estudo', proof: 'Demonstracao' }

export function PublicationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pub, setPub] = useState<PublicationItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    getPublication(id).then(setPub).catch(() => navigate('/explore')).finally(() => setLoading(false))
  }, [id, navigate])

  async function handleLike() {
    if (!pub) return
    const result = await toggleLike(pub.id)
    setPub({ ...pub, liked_by_me: result.liked, like_count: result.like_count })
  }

  async function handleDelete() {
    if (!pub || !confirm('Tem certeza que deseja excluir esta publicacao?')) return
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
    return <div className="flex items-center justify-center h-screen bg-surface-bg"><div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const isAuthor = user?.id === pub.author_id

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"><ArrowLeft size={16} /> Voltar</button>
        <div className="flex items-center gap-2">
          <button onClick={handleLike} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all border ${pub.liked_by_me ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'text-text-secondary hover:text-red-400 border-surface-border hover:border-red-500/20'}`}>
            <Heart size={14} className={pub.liked_by_me ? 'fill-current' : ''} />{pub.like_count}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary border border-surface-border transition-colors">
            <Share2 size={14} />{copied ? 'Copiado!' : 'Compartilhar'}
          </button>
          {isAuthor && (
            <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400/70 hover:text-red-400 border border-surface-border hover:border-red-500/20 transition-colors"><Trash2 size={14} /></button>
          )}
        </div>
      </div>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-text-primary">{pub.title}</h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
          <button onClick={() => navigate(`/profile/${pub.author_id}`)} className="hover:text-accent-500 transition-colors">{pub.author_name}</button>
          <span className="text-text-muted">{TYPE_LABELS[pub.type]}</span>
          <span className="text-text-muted">{new Date(pub.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        {pub.abstract && <p className="mt-2 text-sm text-text-secondary">{pub.abstract}</p>}
      </div>
      <div className="bg-white rounded-xl overflow-hidden border border-surface-border mb-6" style={{ height: '70vh' }}>
        <iframe src={getPdfUrl(pub.id)} className="w-full h-full" title={pub.title} />
      </div>
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <CommentSection publicationId={pub.id} />
      </div>
    </div>
  )
}
