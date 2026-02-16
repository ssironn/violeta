import { useState, useEffect } from 'react'
import { Send, Reply, Trash2 } from 'lucide-react'
import { type CommentItem, getComments, createComment, deleteComment } from '../../api/publications'
import { useAuth } from '../../contexts/AuthContext'

interface CommentSectionProps {
  publicationId: string
}

export function CommentSection({ publicationId }: CommentSectionProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<CommentItem[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getComments(publicationId).then(setComments).catch(console.error).finally(() => setLoading(false))
  }, [publicationId])

  async function handleSubmit() {
    if (!newComment.trim()) return
    try {
      const comment = await createComment(publicationId, newComment.trim(), replyTo?.id)
      setComments((prev) => [...prev, comment])
      setNewComment('')
      setReplyTo(null)
    } catch (err) { console.error(err) }
  }

  async function handleDelete(commentId: string) {
    try {
      await deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) { console.error(err) }
  }

  const topLevel = comments.filter((c) => !c.parent_id)
  const replies = comments.filter((c) => c.parent_id)
  const repliesByParent = new Map<string, CommentItem[]>()
  for (const r of replies) {
    const arr = repliesByParent.get(r.parent_id!) || []
    arr.push(r)
    repliesByParent.set(r.parent_id!, arr)
  }

  if (loading) return <div className="text-sm text-text-muted py-4">Carregando comentarios...</div>

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Comentarios ({comments.length})</h3>
      <div className="space-y-3">
        {topLevel.map((comment) => (
          <div key={comment.id}>
            <CommentBubble comment={comment} isOwn={user?.id === comment.author_id} onReply={() => setReplyTo({ id: comment.id, name: comment.author_name })} onDelete={() => handleDelete(comment.id)} />
            {repliesByParent.get(comment.id)?.map((reply) => (
              <div key={reply.id} className="ml-8 mt-2">
                <CommentBubble comment={reply} isOwn={user?.id === reply.author_id} onDelete={() => handleDelete(reply.id)} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-surface-border pt-3">
        {replyTo && (
          <div className="flex items-center gap-2 text-[11px] text-accent-300/70 mb-2">
            <Reply size={12} /> Respondendo a {replyTo.name}
            <button onClick={() => setReplyTo(null)} className="text-text-muted hover:text-text-primary ml-auto">cancelar</button>
          </div>
        )}
        <div className="flex gap-2">
          <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} placeholder="Escreva um comentario..."
            className="flex-1 bg-surface-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-500/50 transition-colors" />
          <button onClick={handleSubmit} disabled={!newComment.trim()} className="px-3 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-400 transition-colors disabled:opacity-40">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function CommentBubble({ comment, isOwn, onReply, onDelete }: { comment: CommentItem; isOwn: boolean; onReply?: () => void; onDelete: () => void }) {
  const initial = comment.author_name.charAt(0).toUpperCase()
  const date = new Date(comment.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  return (
    <div className="group flex gap-2">
      <div className="w-7 h-7 rounded-full bg-accent-500/20 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-accent-300">{initial}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-text-primary">{comment.author_name}</span>
          <span className="text-[10px] text-text-muted">{date}</span>
        </div>
        <p className="text-[13px] text-text-secondary mt-0.5">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onReply && <button onClick={onReply} className="text-[10px] text-text-muted hover:text-accent-300 flex items-center gap-1"><Reply size={10} /> Responder</button>}
          {isOwn && <button onClick={onDelete} className="text-[10px] text-text-muted hover:text-red-400 flex items-center gap-1"><Trash2 size={10} /> Excluir</button>}
        </div>
      </div>
    </div>
  )
}
