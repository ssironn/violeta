import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { type PublicationItem, getExploreFeed } from '../../api/publications'
import { FeedCard } from './FeedCard'

export function ExplorePage() {
  const navigate = useNavigate()
  const [publications, setPublications] = useState<PublicationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getExploreFeed().then(setPublications).catch(console.error).finally(() => setLoading(false))
  }, [])

  function loadMore() {
    if (publications.length === 0) return
    const last = publications[publications.length - 1]
    getExploreFeed(last.created_at).then((more) => setPublications((prev) => [...prev, ...more])).catch(console.error)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {publications.map((pub) => (<FeedCard key={pub.id} publication={pub} onClick={() => navigate(`/publication/${pub.id}`)} />))}
          </div>
          {publications.length >= 20 && (
            <div className="flex justify-center mt-8"><button onClick={loadMore} className="px-4 py-2 text-sm text-accent-300 hover:text-accent-200 transition-colors">Carregar mais</button></div>
          )}
        </>
      )}
    </div>
  )
}
