import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { type PublicationItem, getExploreFeed } from '../../api/publications'
import { FeedCard } from './FeedCard'

export function ExplorePage() {
  const navigate = useNavigate()
  const [publications, setPublications] = useState<PublicationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getExploreFeed()
      .then(setPublications)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function loadMore() {
    if (publications.length === 0) return
    const last = publications[publications.length - 1]
    getExploreFeed(last.created_at)
      .then((more) => setPublications((prev) => [...prev, ...more]))
      .catch(console.error)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="feed-page-header">
        <h1>Explorar</h1>
        <p>Descubra publicações da comunidade</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : publications.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">
            <Sparkles size={28} className="text-accent-400" />
          </div>
          <h3>Nenhuma publicação ainda</h3>
          <p>Seja o primeiro a publicar um documento.</p>
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
