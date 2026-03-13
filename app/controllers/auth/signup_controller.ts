import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import TokenService from '#services/token_service'
import EmailService from '#services/email_service'
import { registerValidator } from '#validators/auth'

export default class SignupController {
  async handle({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)

    const user = await User.create({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      emailVerified: false,
      twoFactorEnabled: false,
      status: 'active',
      failedLoginAttempts: 0,
    })

    const { token, hash: tokenHash } = TokenService.generateEmailVerificationToken()

    user.emailVerificationToken = tokenHash
    user.emailVerificationSentAt = DateTime.now()
    await user.save()

    await AuditLog.create({
      userId: user.id,
      action: 'user.registered',
      resourceType: 'user',
      resourceId: String(user.id),
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
      severity: 'info',
    })

    await EmailService.sendVerificationEmail(user.email, token, user.fullName || undefined)

    return response.created({
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    })
  }
}
