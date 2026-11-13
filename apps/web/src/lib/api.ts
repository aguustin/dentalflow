/**
 * Single HTTP client for the API.
 * - Access token lives in memory; refresh token in localStorage (survives reloads).
 * - On 401 it refreshes once and retries. Refresh is single-flight: the API rotates
 *   refresh tokens with reuse detection, so two parallel refreshes would revoke the session.
 */

const BASE = '/api/v1'
const REFRESH_KEY = 'df.refreshToken'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message)
  }
}

interface TokenPair {
  accessToken: string
  refreshToken: string
}

let accessToken: string | null = null
let refreshing: Promise<boolean> | null = null
const sessionListeners = new Set<(active: boolean) => void>()

function readRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function setSession(tokens: TokenPair | null): void {
  accessToken = tokens?.accessToken ?? null
  try {
    if (tokens) localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
    else localStorage.removeItem(REFRESH_KEY)
  } catch {
    // storage unavailable: session will just not survive a reload
  }
  sessionListeners.forEach((fn) => fn(!!tokens))
}

/** Notified when the session starts or ends (e.g. refresh failed). Returns an unsubscribe fn. */
export function onSessionChange(fn: (active: boolean) => void): () => void {
  sessionListeners.add(fn)
  return () => sessionListeners.delete(fn)
}

export function hasStoredSession(): boolean {
  return !!readRefreshToken()
}

/** Gets a new token pair using the stored refresh token. Concurrent callers share one request. */
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = readRefreshToken()
      if (!refreshToken) return false
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) throw new Error(String(res.status))
        setSession((await res.json()) as TokenPair)
        return true
      } catch {
        setSession(null)
        return false
      }
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Skip the Authorization header and the refresh-on-401 logic (login, register). */
  anonymous?: boolean
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const send = () =>
    fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(!options.anonymous && accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })

  let res = await send()
  if (res.status === 401 && !options.anonymous && (await refreshSession())) {
    res = await send()
  }

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => undefined)
  if (!res.ok) throw new ApiError(res.status, errorMessage(data, res.status), data)
  return data as T
}

/** Nest errors come as { message: string | string[] } */
function errorMessage(data: unknown, status: number): string {
  const msg = (data as { message?: unknown } | undefined)?.message
  if (Array.isArray(msg)) return msg.join('. ')
  if (typeof msg === 'string') return msg
  return `Error ${status}`
}

export async function login(email: string, password: string, organizationSlug: string): Promise<void> {
  const tokens = await api<TokenPair>('/auth/login', {
    method: 'POST',
    body: { email, password, organizationSlug },
    anonymous: true,
  })
  setSession(tokens)
}

export async function logout(): Promise<void> {
  const refreshToken = readRefreshToken()
  if (refreshToken) {
    await api('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined)
  }
  setSession(null)
}
