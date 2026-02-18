import { Heart, MessageCircle } from 'lucide-react'
import { type PublicationItem, getThumbnailUrl } from '../../api/publications'

const TYPE_LABELS: Record<string, string> = {
  article: 'Artigo',
  exercise_list: 'Exercícios',
  study_material: 'Material',
  proof: 'Demonstração',
}

const TYPE_ICONS: Record<string, string> = {
  article: '§',
  exercise_list: '∑',
  study_material: '∫',
  proof: '∴',
}

interface FeedCardProps {
  publication: PublicationItem
  onClick: () => void
  index?: number
}

export function FeedCard({ publication, onClick, index = 0 }: FeedCardProps) {
  const initial = publication.author_name.charAt(0).toUpperCase()
  const typeIcon = TYPE_ICONS[publication.type] || '·'
  const typeLabel = TYPE_LABELS[publication.type] || publication.type

  return (
    <button
      onClick={onClick}
      className="feed-card group w-full text-left"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Thumbnail */}
      <div className="feed-card-thumb">
        <img
          src={getThumbnailUrl(publication.id)}
          alt={publication.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.parentElement!.classList.add('thumbnail-fallback')
          }}
          className="w-full h-full object-contain object-top transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {/* Type badge */}
        <div className="absolute top-2.5 left-2.5 feed-card-type-badge">
          <span className="font-serif text-[11px] mr-1">{typeIcon}</span>
          <span>{typeLabel}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <h3 className="text-[13px] font-semibold text-text-primary line-clamp-2 leading-[1.4] tracking-tight group-hover:text-accent-400 transition-colors duration-200">
          {publication.title}
        </h3>

        {publication.abstract && (
          <p className="text-[11.5px] text-text-muted line-clamp-2 leading-relaxed">
            {publication.abstract}
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-surface-border/60 mt-auto" />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-[22px] h-[22px] rounded-full bg-accent-500/15 flex items-center justify-center text-[10px] font-bold text-accent-400 ring-1 ring-accent-500/20">
              {initial}
            </div>
            <span className="text-[11px] text-text-secondary font-medium truncate max-w-[100px]">
              {publication.author_name}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-[11px] text-text-muted">
            {publication.like_count > 0 && (
              <span className="flex items-center gap-1">
                <Heart
                  size={11}
                  className={publication.liked_by_me ? 'fill-red-400 text-red-400' : ''}
                />
                {publication.like_count}
              </span>
            )}
            {publication.comment_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle size={11} />
                {publication.comment_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
