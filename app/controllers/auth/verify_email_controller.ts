import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import TokenService from '#services/token_service'
import securityConfig from '#config/security'

export default class VerifyEmailController {
  async handle({ request, response }: HttpContext) {
    const { token } = request.only(['token'])

    if (!token) {
      return response.badRequest({ message: 'Verification token is required' })
    }

    const tokenHash = TokenService.hashToken(token)

    const user = await User.query().where('emailVerificationToken', tokenHash).first()

    if (!user) {
      return response.badRequest({ message: 'Invalid or expired verification token' })
    }

    if (
      !user.emailVerificationSentAt ||
      DateTime.now() >
        user.emailVerificationSentAt.plus({
          seconds: securityConfig.tokens.emailVerificationExpiry,
        })
    ) {
      user.emailVerificationToken = null
      user.emailVerificationSentAt = null
      await user.save()
      return response.badRequest({
        message: 'Verification token has expired. Please request a new one.',
      })
    }

    user.emailVerified = true
    user.emailVerificationToken = null
    user.emailVerificationSentAt = null
    await user.save()

    await AuditLog.create({
      userId: user.id,
      action: 'user.email_verified',
      resourceType: 'user',
      resourceId: String(user.id),
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
      severity: 'info',
    })

    return response.ok({ message: 'Email verified successfully' })
  }
}
