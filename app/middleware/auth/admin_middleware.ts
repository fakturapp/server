import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import env from '#start/env'

export default class AdminMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const user = auth.user!

    const adminEmails = (env.get('ADMIN_EMAILS') || '')
      .split(/[,;]/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (!adminEmails.includes(user.email.toLowerCase())) {
      return response.forbidden({
        message: 'Admin access required',
        code: 'ADMIN_REQUIRED',
      })
    }

    await next()
  }
}
