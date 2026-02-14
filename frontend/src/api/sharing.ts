import { apiFetch } from './client'

export async function shareDocument(docId: string): Promise<{ share_token: string; share_url: string }> {
  const res = await apiFetch(`/documents/${docId}/share`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to share')
  return res.json()
}

export async function revokeShare(docId: string): Promise<void> {
  const res = await apiFetch(`/documents/${docId}/share`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to revoke')
}

export async function getSharedDocument(shareToken: string) {
  const res = await fetch(`/api/shared/${shareToken}`)
  if (!res.ok) throw new Error('Document not found')
  return res.json()
}

export async function copySharedDocument(shareToken: string) {
  const res = await apiFetch(`/shared/${shareToken}/copy`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to copy')
  return res.json()
}
