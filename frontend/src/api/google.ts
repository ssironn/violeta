import { apiFetch } from './client'

export async function getGoogleAuthUrl(): Promise<string> {
  const res = await apiFetch('/google/auth')
  if (!res.ok) throw new Error('Failed to get auth URL')
  const data = await res.json()
  return data.auth_url
}

export async function listGoogleFiles(): Promise<Array<{ id: string; name: string; modifiedTime: string }>> {
  const res = await apiFetch('/google/files')
  if (!res.ok) throw new Error('Failed to list files')
  return res.json()
}

export async function importFromDrive(fileId: string) {
  const res = await apiFetch(`/google/import/${fileId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to import')
  return res.json()
}

export async function exportToDrive(documentId: string) {
  const res = await apiFetch(`/google/export/${documentId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to export')
  return res.json()
}
