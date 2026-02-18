import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Compass } from 'lucide-react'
import { type PublicationItem, getFollowingFeed } from '../../api/publications'
import { FeedCard } from './FeedCard'

export function FeedPage() {
  const navigate = useNavigate()
  const [publications, setPublications] = useState<PublicationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFollowingFeed()
      .then(setPublications)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function loadMore() {
    if (publications.length === 0) return
    const last = publications[publications.length - 1]
    getFollowingFeed(last.created_at)
      .then((more) => setPublications((prev) => [...prev, ...more]))
      .catch(console.error)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="feed-page-header">
        <h1>Seu Feed</h1>
        <p>Publicações de quem você segue</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : publications.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">
            <Users size={28} className="text-accent-400" />
          </div>
          <h3>Nenhuma publicação ainda</h3>
          <p>Siga outros usuários para ver as publicações deles aqui.</p>
          <button
            onClick={() => navigate('/explore')}
            className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white rounded-full text-sm font-medium hover:bg-accent-400 transition-colors"
          >
            <Compass size={15} />
            Explorar publicações
          </button>
        </div>
      ) : (
        <>
          <div className="feed-grid">
            {publications.map((pub, i) => (
              <FeedCard
                key={pub.id}
                publication={pub}
                onClick={() => navigate(`/publication/${pub.id}`)}
                index={i}
              />
            ))}
          </div>
          {publications.length >= 20 && (
            <div className="feed-load-more">
              <button onClick={loadMore}>Carregar mais</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
