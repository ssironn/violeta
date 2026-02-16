import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react'
import { type UserProfile, getUserProfile, toggleFollow } from '../../api/follows'
import { type PublicationItem, getExploreFeed } from '../../api/publications'
import { FeedCard } from './FeedCard'
import { useAuth } from '../../contexts/AuthContext'

export function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [publications, setPublications] = useState<PublicationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([getUserProfile(id), getExploreFeed()])
      .then(([prof, pubs]) => { setProfile(prof); setPublications(pubs.filter((p) => p.author_id === id)) })
      .catch(console.error).finally(() => setLoading(false))
  }, [id])

  async function handleFollow() {
    if (!id || !profile) return
    const result = await toggleFollow(id)
    setProfile({ ...profile, is_following: result.following, follower_count: profile.follower_count + (result.following ? 1 : -1) })
  }

  if (loading || !profile) return <div className="flex items-center justify-center h-screen bg-surface-bg"><div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" /></div>

  const isMe = user?.id === id
  const initial = profile.name.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors mb-6"><ArrowLeft size={16} /> Voltar</button>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-accent-500/20 flex items-center justify-center text-2xl font-bold text-accent-500">{initial}</div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-text-primary">{profile.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
              <span><strong className="text-text-primary">{profile.publication_count}</strong> publicacoes</span>
              <span><strong className="text-text-primary">{profile.follower_count}</strong> seguidores</span>
              <span><strong className="text-text-primary">{profile.following_count}</strong> seguindo</span>
            </div>
          </div>
          {!isMe && (
            <button onClick={handleFollow} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${profile.is_following ? 'bg-surface-card text-text-primary border-surface-border hover:border-red-500/30 hover:text-red-400' : 'bg-accent-500 text-white border-accent-500 hover:bg-accent-400'}`}>
              {profile.is_following ? <><UserMinus size={14} /> Seguindo</> : <><UserPlus size={14} /> Seguir</>}
            </button>
          )}
        </div>
        {publications.length === 0 ? (
          <p className="text-center text-text-muted py-12">Nenhuma publicacao ainda.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {publications.map((pub) => (<FeedCard key={pub.id} publication={pub} onClick={() => navigate(`/publication/${pub.id}`)} />))}
          </div>
        )}
      </div>
    </div>
  )
}
