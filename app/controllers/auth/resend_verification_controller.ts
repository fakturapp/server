import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import TokenService from '#services/token_service'
import EmailService from '#services/email_service'

export default class ResendVerificationController {
  async handle({ request, response }: HttpContext) {
    const { email } = request.only(['email'])

    const user = await User.findBy('email', email)

    if (!user) {
      return response.ok({ message: 'If this email exists, a verification email will be sent.' })
    }

    if (user.emailVerified) {
      return response.badRequest({ message: 'Email is already verified' })
    }

    user.emailVerificationToken = null
    user.emailVerificationSentAt = null
    await user.save()

    const { token, hash: tokenHash } = TokenService.generateEmailVerificationToken()

    user.emailVerificationToken = tokenHash
    user.emailVerificationSentAt = DateTime.now()
    await user.save()

    await EmailService.sendVerificationEmail(user.email, token, user.fullName || undefined)

    return response.ok({
      message: 'If this email exists, a verification email will be sent.',
    })
  }
}
