import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { type PublicationItem, getFollowingFeed } from '../../api/publications'
import { FeedCard } from './FeedCard'

export function FeedPage() {
  const navigate = useNavigate()
  const [publications, setPublications] = useState<PublicationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFollowingFeed().then(setPublications).catch(console.error).finally(() => setLoading(false))
  }, [])

  function loadMore() {
    if (publications.length === 0) return
    const last = publications[publications.length - 1]
    getFollowingFeed(last.created_at).then((more) => setPublications((prev) => [...prev, ...more])).catch(console.error)
  }

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-text-primary">Feed</h1>
          <div className="flex gap-2">
            <button onClick={() => navigate('/feed')} className="px-3 py-1.5 text-[12px] font-medium bg-violet-500/20 text-violet-200 rounded-lg border border-violet-500/30">Seguindo</button>
            <button onClick={() => navigate('/explore')} className="px-3 py-1.5 text-[12px] font-medium text-text-muted hover:text-text-primary hover:bg-white/[0.05] rounded-lg border border-transparent transition-colors">Explorar</button>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : publications.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-text-muted mb-3" />
            <p className="text-text-secondary">Siga outros usuarios para ver publicacoes aqui.</p>
            <button onClick={() => navigate('/explore')} className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm hover:bg-violet-400 transition-colors">Explorar publicacoes</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {publications.map((pub) => (<FeedCard key={pub.id} publication={pub} onClick={() => navigate(`/publication/${pub.id}`)} />))}
            </div>
            {publications.length >= 20 && (
              <div className="flex justify-center mt-8"><button onClick={loadMore} className="px-4 py-2 text-sm text-violet-300 hover:text-violet-200 transition-colors">Carregar mais</button></div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
