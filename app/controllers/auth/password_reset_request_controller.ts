import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import TokenService from '#services/token_service'
import EmailService from '#services/email_service'
import { passwordResetRequestValidator } from '#validators/auth'

export default class PasswordResetRequestController {
  async handle({ request, response }: HttpContext) {
    const data = await request.validateUsing(passwordResetRequestValidator)

    const user = await User.findBy('email', data.email)

    if (!user || user.status !== 'active') {
      return response.ok({
        message: 'If this email exists, a password reset link will be sent.',
      })
    }

    const { token, hash, expiresAt } = TokenService.generatePasswordResetToken()

    user.passwordResetToken = hash
    user.passwordResetExpiresAt = expiresAt
    await user.save()

    await AuditLog.create({
      userId: user.id,
      action: 'user.password_reset_requested',
      resourceType: 'user',
      resourceId: String(user.id),
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
      severity: 'info',
    })

    await EmailService.sendPasswordResetEmail(user.email, token, user.fullName || undefined)

    return response.ok({
      message: 'If this email exists, a password reset link will be sent.',
    })
  }
}
