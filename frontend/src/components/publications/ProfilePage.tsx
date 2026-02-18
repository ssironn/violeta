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
      .then(([prof, pubs]) => {
        setProfile(prof)
        setPublications(pubs.filter((p) => p.author_id === id))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function handleFollow() {
    if (!id || !profile) return
    const result = await toggleFollow(id)
    setProfile({
      ...profile,
      is_following: result.following,
      follower_count: profile.follower_count + (result.following ? 1 : -1),
    })
  }

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-bg">
        <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isMe = user?.id === id
  const initial = profile.name.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="pub-back-btn mb-6"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="profile-header">
          <div className="profile-avatar">{initial}</div>
          <div className="flex-1">
            <h1 className="profile-name">{profile.name}</h1>
            <div className="profile-stats">
              <span>
                <strong>{profile.publication_count}</strong> publicações
              </span>
              <span>
                <strong>{profile.follower_count}</strong> seguidores
              </span>
              <span>
                <strong>{profile.following_count}</strong> seguindo
              </span>
            </div>
          </div>
          {!isMe && (
            <button
              onClick={handleFollow}
              className={`profile-follow-btn ${profile.is_following ? 'following' : 'not-following'}`}
            >
              {profile.is_following ? (
                <>
                  <UserMinus size={14} /> Seguindo
                </>
              ) : (
                <>
                  <UserPlus size={14} /> Seguir
                </>
              )}
            </button>
          )}
        </div>

        {publications.length === 0 ? (
          <div className="feed-empty">
            <h3>Nenhuma publicação ainda</h3>
            <p>Este usuário ainda não publicou nenhum documento.</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
