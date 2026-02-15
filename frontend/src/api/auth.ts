import { apiFetch, setAccessToken } from './client'

export interface User {
  id: string
  name: string
  email: string
  created_at: string
}

export async function register(name: string, email: string, password: string): Promise<User> {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  if (!res.ok) {
    const detail = await extractErrorDetail(res)
    throw new Error(detail || 'Falha ao criar conta')
  }
  return res.json()
}

export async function login(email: string, password: string): Promise<User> {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const detail = await extractErrorDetail(res)
    throw new Error(detail || 'Email ou senha incorretos')
  }
  const data = await res.json()
  setAccessToken(data.access_token)
  return getMe()
}

async function extractErrorDetail(res: Response): Promise<string> {
  try {
    const err = await res.json()
    return err.detail || ''
  } catch {
    return ''
  }
}

export async function getMe(): Promise<User> {
  const res = await apiFetch('/auth/me')
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // ignore errors — we still want to clear locally
  }
  setAccessToken(null)
}
