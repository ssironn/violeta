import { apiFetch } from './client'

export interface UserProfile {
  id: string
  name: string
  publication_count: number
  follower_count: number
  following_count: number
  is_following: boolean
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const res = await apiFetch(`/users/${userId}/profile`)
  if (!res.ok) throw new Error('Failed to get profile')
  return res.json()
}

export async function toggleFollow(userId: string): Promise<{ following: boolean }> {
  const res = await apiFetch(`/users/${userId}/follow`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to toggle follow')
  return res.json()
}

export async function getFollowers(userId: string): Promise<{ id: string; name: string }[]> {
  const res = await apiFetch(`/users/${userId}/followers`)
  if (!res.ok) throw new Error('Failed to get followers')
  return res.json()
}

export async function getFollowing(userId: string): Promise<{ id: string; name: string }[]> {
  const res = await apiFetch(`/users/${userId}/following`)
  if (!res.ok) throw new Error('Failed to get following')
  return res.json()
}
