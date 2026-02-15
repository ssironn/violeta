import { Heart, MessageCircle } from 'lucide-react'
import { type PublicationItem, getThumbnailUrl } from '../../api/publications'

const TYPE_LABELS: Record<string, string> = {
  article: 'Artigo',
  exercise_list: 'Exercicios',
  study_material: 'Material',
  proof: 'Demonstracao',
}

const TYPE_COLORS: Record<string, string> = {
  article: 'bg-blue-500/20 text-blue-300',
  exercise_list: 'bg-emerald-500/20 text-emerald-300',
  study_material: 'bg-amber-500/20 text-amber-300',
  proof: 'bg-purple-500/20 text-purple-300',
}

interface FeedCardProps {
  publication: PublicationItem
  onClick: () => void
}

export function FeedCard({ publication, onClick }: FeedCardProps) {
  const initial = publication.author_name.charAt(0).toUpperCase()

  return (
    <button onClick={onClick} className="w-full text-left bg-surface-card border border-surface-border rounded-xl overflow-hidden hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all group">
      <div className="aspect-[3/4] max-h-[280px] bg-white overflow-hidden flex items-center justify-center">
        <img src={getThumbnailUrl(publication.id)} alt={publication.title} loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.classList.add('thumbnail-fallback') }}
          className="w-full h-full object-contain object-top group-hover:scale-[1.02] transition-transform duration-300" />
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${TYPE_COLORS[publication.type] || 'bg-gray-500/20 text-gray-300'}`}>
            {TYPE_LABELS[publication.type] || publication.type}
          </span>
        </div>
        <h3 className="text-sm font-medium text-text-primary line-clamp-2 leading-snug">{publication.title}</h3>
        {publication.abstract && <p className="text-[12px] text-text-secondary line-clamp-2">{publication.abstract}</p>}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-300">{initial}</div>
            <span className="text-[11px] text-text-secondary">{publication.author_name}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            <span className="flex items-center gap-1"><Heart size={12} className={publication.liked_by_me ? 'fill-red-400 text-red-400' : ''} />{publication.like_count}</span>
            <span className="flex items-center gap-1"><MessageCircle size={12} />{publication.comment_count}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
