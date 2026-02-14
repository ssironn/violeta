import { apiFetch, getAccessToken } from './client'

export interface PublicationItem {
  id: string
  author_id: string
  author_name: string
  document_id: string | null
  title: string
  abstract: string | null
  type: 'article' | 'exercise_list' | 'study_material' | 'proof'
  share_token: string
  like_count: number
  comment_count: number
  created_at: string
  liked_by_me: boolean
}

export interface PublicPublication {
  id: string
  author_name: string
  title: string
  abstract: string | null
  type: string
  like_count: number
  comment_count: number
  created_at: string
}

export interface CommentItem {
  id: string
  publication_id: string
  author_id: string
  author_name: string
  parent_id: string | null
  content: string
  created_at: string
}

export async function createPublication(
  pdfBlob: Blob,
  metadata: { title: string; type: string; abstract?: string; document_id?: string },
): Promise<PublicationItem> {
  const formData = new FormData()
  formData.append('pdf', pdfBlob, 'document.pdf')
  formData.append('title', metadata.title)
  formData.append('type', metadata.type)
  if (metadata.abstract) formData.append('abstract', metadata.abstract)
  if (metadata.document_id) formData.append('document_id', metadata.document_id)
  const token = getAccessToken()
  const res = await fetch('/api/publications/', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to create publication')
  return res.json()
}

export async function getExploreFeed(cursor?: string): Promise<PublicationItem[]> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  const res = await apiFetch(`/publications/explore?${params}`)
  if (!res.ok) throw new Error('Failed to load explore feed')
  return res.json()
}

export async function getFollowingFeed(cursor?: string): Promise<PublicationItem[]> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  const res = await apiFetch(`/publications/feed?${params}`)
  if (!res.ok) throw new Error('Failed to load feed')
  return res.json()
}

export async function getPublication(id: string): Promise<PublicationItem> {
  const res = await apiFetch(`/publications/${id}`)
  if (!res.ok) throw new Error('Failed to get publication')
  return res.json()
}

export async function deletePublication(id: string): Promise<void> {
  const res = await apiFetch(`/publications/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete publication')
}

export async function getPublicPublication(shareToken: string): Promise<PublicPublication> {
  const res = await fetch(`/api/p/${shareToken}`)
  if (!res.ok) throw new Error('Publication not found')
  return res.json()
}

export async function toggleLike(pubId: string): Promise<{ liked: boolean; like_count: number }> {
  const res = await apiFetch(`/publications/${pubId}/like`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle like')
  return res.json()
}

export async function getComments(pubId: string, cursor?: string): Promise<CommentItem[]> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  const res = await apiFetch(`/publications/${pubId}/comments?${params}`)
  if (!res.ok) throw new Error('Failed to load comments')
  return res.json()
}

export async function createComment(pubId: string, content: string, parentId?: string): Promise<CommentItem> {
  const res = await apiFetch(`/publications/${pubId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parent_id: parentId || null }),
  })
  if (!res.ok) throw new Error('Failed to create comment')
  return res.json()
}

export async function deleteComment(commentId: string): Promise<void> {
  const res = await apiFetch(`/comments/${commentId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete comment')
}

export function getPdfUrl(pubId: string): string {
  return `/api/publications/${pubId}/pdf`
}

export function getThumbnailUrl(pubId: string): string {
  return `/api/publications/${pubId}/thumbnail`
}
