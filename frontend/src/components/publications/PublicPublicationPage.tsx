import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, MessageCircle } from 'lucide-react'
import { type PublicPublication, getPublicPublication } from '../../api/publications'

const TYPE_LABELS: Record<string, string> = { article: 'Artigo', exercise_list: 'Lista de Exercicios', study_material: 'Material de Estudo', proof: 'Demonstracao' }

export function PublicPublicationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [pub, setPub] = useState<PublicPublication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) return
    getPublicPublication(token).then(setPub).catch(() => setError(true)).finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="flex items-center justify-center h-screen bg-surface-bg"><div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" /></div>
  if (error || !pub) return (
    <div className="flex flex-col items-center justify-center h-screen bg-surface-bg gap-4">
      <p className="text-text-secondary">Publicacao nao encontrada.</p>
      <button onClick={() => navigate('/')} className="text-sm text-accent-400 hover:text-accent-500">Ir para Violeta</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/')} className="text-sm text-accent-400 hover:text-accent-500 transition-colors font-serif tracking-wide">Violeta</button>
          <button onClick={() => navigate('/signin')} className="px-4 py-1.5 text-[13px] font-semibold bg-accent-500 text-white rounded-lg hover:bg-accent-400 transition-colors">Entrar</button>
        </div>
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-text-primary">{pub.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
            <span>{pub.author_name}</span>
            <span className="text-text-muted">{TYPE_LABELS[pub.type]}</span>
            <span className="text-text-muted">{new Date(pub.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
          {pub.abstract && <p className="mt-2 text-sm text-text-secondary">{pub.abstract}</p>}
          <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
            <span className="flex items-center gap-1"><Heart size={14} /> {pub.like_count}</span>
            <span className="flex items-center gap-1"><MessageCircle size={14} /> {pub.comment_count}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl overflow-hidden border border-surface-border" style={{ height: '80vh' }}>
          <iframe src={`/api/publications/${pub.id}/pdf`} className="w-full h-full" title={pub.title} />
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-text-secondary mb-3">Entre no Violeta para curtir, comentar e publicar.</p>
          <button onClick={() => navigate('/signin')} className="px-6 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-400 transition-colors text-sm font-medium">Criar conta gratis</button>
        </div>
      </div>
    </div>
  )
}
