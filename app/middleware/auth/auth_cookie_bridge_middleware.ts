import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { bridgeAuthCookiesToHeaders } from '#services/auth/auth_cookie_service'

export default class AuthCookieBridgeMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    bridgeAuthCookiesToHeaders(ctx)
    return next()
  }
}
