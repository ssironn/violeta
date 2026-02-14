const BASE_URL = '/api'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' })
  if (res.status === 401 && accessToken) {
    // Try refresh
    const refresh = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (refresh.ok) {
      const data = await refresh.json()
      accessToken = data.access_token
      headers['Authorization'] = `Bearer ${accessToken}`
      return fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' })
    }
    accessToken = null
  }
  return res
}
