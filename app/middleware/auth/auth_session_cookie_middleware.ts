import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { setAuthTokenCookie } from '#services/auth/auth_cookie'

export default class AuthSessionCookieMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await next()
    const body = ctx.response.getBody()
    if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).token === 'string') {
      setAuthTokenCookie(ctx.response, (body as Record<string, string>).token)
    }
  }
}
