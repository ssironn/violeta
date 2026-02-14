const BASE_URL = '/api'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

/** Try to obtain a fresh access token using the refresh cookie */
export async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      accessToken = data.access_token
      return true
    }
  } catch {
    // network error, ignore
  }
  return false
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
  if (res.status === 401 || (res.status === 403 && !accessToken)) {
    // Try refresh — 403 happens when no token is sent (HTTPBearer returns 403)
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`
      return fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' })
    }
    accessToken = null
  }
  return res
}
