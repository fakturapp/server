import type { HttpContext } from '@adonisjs/core/http'

const COOKIE_NAME = '__Secure-faktur_token'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 15

function cookieDomain(): string | undefined {
  const domain = process.env.COOKIE_DOMAIN
  return domain && domain.trim() ? domain.trim() : undefined
}

export function setAuthTokenCookie(response: HttpContext['response'], token: string): void {
  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    domain: cookieDomain(),
    maxAge: MAX_AGE_SECONDS,
  })
}

export function clearAuthTokenCookie(response: HttpContext['response']): void {
  response.clearCookie(COOKIE_NAME, {
    path: '/',
    domain: cookieDomain(),
  })
}
