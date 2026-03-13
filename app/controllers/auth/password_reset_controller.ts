import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import TokenService from '#services/token_service'
import { passwordResetValidator } from '#validators/auth'

export default class PasswordResetController {
  async handle({ request, response }: HttpContext) {
    const data = await request.validateUsing(passwordResetValidator)

    const tokenHash = TokenService.hashToken(data.token)

    const user = await User.query().where('passwordResetToken', tokenHash).first()

    if (!user) {
      return response.badRequest({ message: 'Invalid reset token' })
    }

    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < DateTime.now()) {
      user.passwordResetToken = null
      user.passwordResetExpiresAt = null
      await user.save()

      return response.badRequest({
        message: 'Reset token has expired. Please request a new one.',
      })
    }

    user.password = data.password
    user.passwordResetToken = null
    user.passwordResetExpiresAt = null
    user.failedLoginAttempts = 0
    user.lockedUntil = null
    await user.save()

    await AuditLog.create({
      userId: user.id,
      action: 'user.password_reset',
      resourceType: 'user',
      resourceId: String(user.id),
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
      severity: 'warning',
    })

    return response.ok({ message: 'Password has been reset successfully' })
  }
}
