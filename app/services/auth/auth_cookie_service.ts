import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

export const AUTH_COOKIE_NAME = 'faktur_auth'
export const VAULT_COOKIE_NAME = 'faktur_vault'

export const DEFAULT_AUTH_TTL_SECONDS = 15 * 24 * 60 * 60
export const DEFAULT_VAULT_TTL_SECONDS = 15 * 24 * 60 * 60

type Response = HttpContext['response']
type Request = HttpContext['request']

function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAgeSeconds?: number
    expires?: Date
  } = {}
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
  ]

  if (app.inProduction) {
    parts.push('Secure')
  }
  if (typeof options.maxAgeSeconds === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`)
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`)
  }

  return parts.join('; ')
}

function appendSetCookie(response: Response, cookie: string) {
  response.response.appendHeader('Set-Cookie', cookie)
}

export function readCookieValue(rawCookieHeader: string | undefined, name: string): string | null {
  if (!rawCookieHeader) return null

  for (const chunk of rawCookieHeader.split(';')) {
    const [cookieName, ...rest] = chunk.trim().split('=')
    if (cookieName !== name) continue
    const rawValue = rest.join('=')
    if (!rawValue) return null

    try {
      return decodeURIComponent(rawValue)
    } catch {
      return rawValue
    }
  }

  return null
}

export function readAuthCookies(request: Request): {
  authToken: string | null
  vaultKey: string | null
} {
  const rawCookieHeader = request.header('cookie')

  return {
    authToken: readCookieValue(rawCookieHeader, AUTH_COOKIE_NAME),
    vaultKey: readCookieValue(rawCookieHeader, VAULT_COOKIE_NAME),
  }
}

export function setAuthSessionCookies(
  response: Response,
  options: {
    authToken: string
    vaultKey?: string | null
    authTtlSeconds?: number
    vaultTtlSeconds?: number
  }
) {
  appendSetCookie(
    response,
    serializeCookie(AUTH_COOKIE_NAME, options.authToken, {
      maxAgeSeconds: options.authTtlSeconds ?? DEFAULT_AUTH_TTL_SECONDS,
    })
  )

  if (options.vaultKey) {
    appendSetCookie(
      response,
      serializeCookie(VAULT_COOKIE_NAME, options.vaultKey, {
        maxAgeSeconds: options.vaultTtlSeconds ?? DEFAULT_VAULT_TTL_SECONDS,
      })
    )
  } else {
    clearVaultCookie(response)
  }
}

export function setVaultCookie(
  response: Response,
  vaultKey: string,
  ttlSeconds: number = DEFAULT_VAULT_TTL_SECONDS
) {
  appendSetCookie(
    response,
    serializeCookie(VAULT_COOKIE_NAME, vaultKey, {
      maxAgeSeconds: ttlSeconds,
    })
  )
}

export function clearVaultCookie(response: Response) {
  appendSetCookie(
    response,
    serializeCookie(VAULT_COOKIE_NAME, '', {
      maxAgeSeconds: 0,
      expires: new Date(0),
    })
  )
}

export function clearAuthSessionCookies(response: Response) {
  appendSetCookie(
    response,
    serializeCookie(AUTH_COOKIE_NAME, '', {
      maxAgeSeconds: 0,
      expires: new Date(0),
    })
  )
  clearVaultCookie(response)
}

export function bridgeAuthCookiesToHeaders(ctx: HttpContext) {
  const { authToken, vaultKey } = readAuthCookies(ctx.request)
  const headers = ctx.request.request.headers as Record<string, string | string[] | undefined>

  if (authToken && !ctx.request.header('authorization')) {
    headers.authorization = `Bearer ${authToken}`
  }

  if (vaultKey && !ctx.request.header('x-vault-key')) {
    headers['x-vault-key'] = vaultKey
  }
}
