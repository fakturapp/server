import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { ApiError } from '#exceptions/api_error'

export default class EmailVerifiedMiddleware {
  async handle({ auth }: HttpContext, next: NextFn) {
    const user = auth.user!
    if (!user.emailVerified) {
      throw new ApiError('account_email_not_verified')
    }
    await next()
  }
}
