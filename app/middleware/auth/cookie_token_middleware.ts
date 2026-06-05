import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class CookieTokenMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!ctx.request.header('authorization')) {
      const token = ctx.request.cookie('__Secure-faktur_token')
      if (token && typeof token === 'string') {
        ctx.request.request.headers.authorization = `Bearer ${token}`
      }
    }
    return next()
  }
}
