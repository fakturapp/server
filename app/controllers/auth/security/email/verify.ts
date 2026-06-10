import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/account/user'
import TokenService from '#services/auth/token_service'
import AuditLog from '#models/shared/audit_log'
import securityConfig from '#config/security'
import { realClientIp } from '#services/http/real_client_ip'

export default class Verify {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const clientIp = realClientIp(ctx)
    const { token } = request.only(['token'])

    if (!token) {
      return response.badRequest({ message: 'Verification token is required' })
    }

    const tokenHash = TokenService.hashToken(token)

    const user = await User.findBy('emailVerificationToken', tokenHash)

    if (!user) {
      const email = String(request.input('email', '') || '').toLowerCase()
      if (email) {
        const existing = await User.findBy('email', email)
        if (existing?.emailVerified) {
          return response.ok({ message: 'Email déjà vérifié', alreadyVerified: true })
        }
      }
      return response.badRequest({ message: 'Lien de vérification invalide ou expiré' })
    }

    if (user.emailVerificationSentAt) {
      const expiresAt = user.emailVerificationSentAt.plus({
        seconds: securityConfig.tokens.emailVerificationExpiry,
      })
      if (DateTime.now() > expiresAt) {
        return response.badRequest({ message: 'Le lien de vérification a expiré' })
      }
    }

    user.emailVerified = true
    user.emailVerificationToken = null
    user.emailVerificationSentAt = null
    await user.save()

    await AuditLog.create({
      userId: user.id,
      action: 'user.email_verified',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: clientIp,
      userAgent: request.header('user-agent'),
      severity: 'info',
    })

    return response.ok({ message: 'Email verified successfully' })
  }
}
