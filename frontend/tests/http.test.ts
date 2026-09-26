import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, setAccessTokenExpiry } from '../lib/http'
import { postLoginPath, safeRedirectPath } from '../lib/auth'

const API = 'http://127.0.0.1:5000'

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('apiFetch request queue', () => {
  let tokenValid: boolean
  let refreshCalls: number
  let releaseRefresh: (() => void) | null
  const fetchMock = vi.fn()

  beforeEach(() => {
    tokenValid = false
    refreshCalls = 0
    releaseRefresh = null
    setAccessTokenExpiry(null)
    fetchMock.mockReset()
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1
        await new Promise<void>((resolve) => {
          releaseRefresh = resolve
        })
        tokenValid = true
        return json(200, { accessTokenExpiresAt: Date.now() + 15 * 60 * 1000 })
      }
      return tokenValid ? json(200, { ok: true }) : json(401, { code: 'TOKEN_EXPIRED' })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

  it('refreshes once for many concurrent 401s and retries each request', async () => {
    const requests = [1, 2, 3].map((n) => apiFetch(`${API}/api/cases/${n}`))
    await flush()
    expect(refreshCalls).toBe(1)

    releaseRefresh?.()
    const responses = await Promise.all(requests)
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200])
    expect(refreshCalls).toBe(1)
  })

  it('holds new requests until an in-flight refresh finishes', async () => {
    const first = apiFetch(`${API}/api/cases/1`)
    await flush()
    const queued = apiFetch(`${API}/api/cases/2`)
    await flush()

    // The queued request has not been sent with the stale token
    const sentForCase2 = fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/cases/2'))
    expect(sentForCase2).toHaveLength(0)

    releaseRefresh?.()
    expect((await first).status).toBe(200)
    expect((await queued).status).toBe(200)
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/cases/2'))).toHaveLength(1)
  })

  it('refreshes before sending when the token is known to be expired', async () => {
    setAccessTokenExpiry(Date.now() - 1000)
    const request = apiFetch(`${API}/api/cases/1`)
    await flush()
    expect(refreshCalls).toBe(1)
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/cases/1'))).toHaveLength(0)

    releaseRefresh?.()
    expect((await request).status).toBe(200)
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/api/cases/1'))).toHaveLength(1)
  })

  it('does not try to refresh on a failed login', async () => {
    const response = await apiFetch(`${API}/api/auth/login`, { method: 'POST' })
    expect(response.status).toBe(401)
    expect(refreshCalls).toBe(0)
  })

  it('does not sign out when the refresh fails for network reasons', async () => {
    const expired = vi.fn()
    vi.stubGlobal('window', Object.assign(new EventTarget(), { dispatchEvent: expired }))
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/api/auth/refresh')) throw new TypeError('Failed to fetch')
      return json(401, {})
    })
    const response = await apiFetch(`${API}/api/cases/1`)
    expect(response.status).toBe(401)
    expect(expired).not.toHaveBeenCalled()

    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/api/auth/refresh') ? json(503, {}) : json(401, {}),
    )
    await apiFetch(`${API}/api/cases/1`)
    expect(expired).not.toHaveBeenCalled()
  })

  it('signs out when the server rejects the refresh', async () => {
    const expired = vi.fn()
    vi.stubGlobal('window', Object.assign(new EventTarget(), { dispatchEvent: expired }))
    fetchMock.mockImplementation(async () => json(401, {}))
    await apiFetch(`${API}/api/cases/1`)
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it('returns the 401 when the refresh itself fails', async () => {
    fetchMock.mockImplementation(async () => json(401, {}))
    const response = await apiFetch(`${API}/api/cases/1`)
    expect(response.status).toBe(401)
    // original + refresh, no retry
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('post-login redirect', () => {
  it('sends each role to its own dashboard by default', () => {
    expect(postLoginPath('admin', null)).toBe('/dashboard/admin')
    expect(postLoginPath('client', undefined)).toBe('/dashboard/client')
  })

  it('never sends an admin to the client dashboard (the old logout loop)', () => {
    expect(postLoginPath('admin', '/dashboard/client')).toBe('/dashboard/admin')
    expect(postLoginPath('admin', '/dashboard/client/cases')).toBe('/dashboard/admin')
  })

  it('keeps redirects that fit the role', () => {
    expect(postLoginPath('admin', '/dashboard/admin/cases')).toBe('/dashboard/admin/cases')
    expect(postLoginPath('client', '/appointment?lawyerId=1')).toBe('/appointment?lawyerId=1')
  })

  it('rejects off-site redirects', () => {
    expect(safeRedirectPath('https://evil.example')).toBeNull()
    expect(safeRedirectPath('//evil.example')).toBeNull()
    expect(safeRedirectPath('/\\evil.example')).toBeNull()
    expect(postLoginPath('client', '//evil.example')).toBe('/dashboard/client')
  })
})
