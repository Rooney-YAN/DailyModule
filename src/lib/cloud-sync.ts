import type { PlannerData } from '../types'

const SESSION_KEY = 'dailymodule-supabase-session'

export type CloudSession = {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  userId: string
  email?: string
}

type AuthResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: { id: string; email?: string }
  error_description?: string
  msg?: string
}

const config = () => ({
  url: import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, ''),
  key: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

export const isCloudConfigured = () => Boolean(config().url && config().key)

export const loadCloudSession = (): CloudSession | undefined => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? '') as CloudSession } catch { return undefined }
}

export const clearCloudSession = () => localStorage.removeItem(SESSION_KEY)

const request = async <T>(path: string, options: RequestInit = {}) => {
  const { url, key } = config()
  if (!url || !key) throw new Error('Supabase has not been configured yet.')
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: key, 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  })
  const body = await response.json().catch(() => ({})) as T & { message?: string; error?: string; hint?: string }
  if (!response.ok) throw new Error(body.message ?? body.error ?? 'Cloud sync failed.')
  return body
}

const storeSession = (response: AuthResponse): CloudSession => {
  if (!response.access_token || !response.user?.id) throw new Error(response.error_description ?? response.msg ?? 'Unable to sign in.')
  const session: CloudSession = { accessToken: response.access_token, refreshToken: response.refresh_token, expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000, userId: response.user.id, email: response.user.email }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export const signInToCloud = async (email: string, password: string) =>
  storeSession(await request<AuthResponse>('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }))

export const signUpForCloud = async (email: string, password: string) => {
  const response = await request<AuthResponse>('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (!response.access_token) return undefined
  return storeSession(response)
}

const activeSession = async (session: CloudSession) => {
  if (!session.refreshToken || !session.expiresAt || session.expiresAt > Date.now() + 60_000) return session
  const response = await request<AuthResponse>('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refreshToken }) })
  const refreshed = storeSession(response)
  Object.assign(session, refreshed)
  return session
}

export const loadCloudData = async (session: CloudSession): Promise<PlannerData | undefined> => {
  const current = await activeSession(session)
  const rows = await request<Array<{ data: PlannerData }>>(`/rest/v1/planner_data?user_id=eq.${encodeURIComponent(current.userId)}&select=data`, {
    headers: { Authorization: `Bearer ${current.accessToken}` },
  })
  return rows[0]?.data
}

export const saveCloudData = async (session: CloudSession, data: PlannerData) => {
  const current = await activeSession(session)
  await request('/rest/v1/planner_data?on_conflict=user_id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${current.accessToken}`, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: current.userId, data, updated_at: new Date().toISOString() }),
  })
}
