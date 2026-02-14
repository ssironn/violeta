import { apiFetch } from './client'

export interface DocumentListItem {
  id: string
  title: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface DocumentFull extends DocumentListItem {
  owner_id: string
  content: Record<string, any>
  share_token: string | null
  copied_from_id: string | null
  google_drive_file_id: string | null
}

export async function listDocuments(): Promise<DocumentListItem[]> {
  const res = await apiFetch('/documents/')
  if (!res.ok) throw new Error('Failed to list documents')
  return res.json()
}

export async function getDocument(id: string): Promise<DocumentFull> {
  const res = await apiFetch(`/documents/${id}`)
  if (!res.ok) throw new Error('Failed to get document')
  return res.json()
}

export async function createDocument(title?: string): Promise<DocumentFull> {
  const res = await apiFetch('/documents/', {
    method: 'POST',
    body: JSON.stringify({ title: title || 'Untitled' }),
  })
  if (!res.ok) throw new Error('Failed to create document')
  return res.json()
}

export async function updateDocument(id: string, data: { title?: string; content?: any }): Promise<DocumentFull> {
  const res = await apiFetch(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update document')
  return res.json()
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await apiFetch(`/documents/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete document')
}
