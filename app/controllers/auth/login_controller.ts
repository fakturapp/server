import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import LoginHistory from '#models/login_history'
import AuditLog from '#models/audit_log'
import TwoFactorService from '#services/two_factor_service'
import { loginValidator } from '#validators/auth'

export default class LoginController {
  async handle({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const code = request.input('code')

    const user = await User.findBy('email', email)

    if (!user || user.status !== 'active') {
      await this.recordLoginAttempt(request, null, 'failed', 'Invalid credentials')
      return response.unauthorized({ message: 'Invalid email or password' })
    }

    if (user.lockedUntil && user.lockedUntil > DateTime.now()) {
      await this.recordLoginAttempt(request, user.id, 'blocked', 'Account locked')
      return response.tooManyRequests({
        message: 'Account temporarily locked due to too many failed attempts',
        lockedUntil: user.lockedUntil.toISO(),
      })
    }

    const passwordValid = await User.verifyCredentials(email, password)
      .then(() => true)
      .catch(() => false)

    if (!passwordValid) {
      user.failedLoginAttempts += 1
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = DateTime.now().plus({ minutes: 15 })
      }
      await user.save()
      await this.recordLoginAttempt(request, user.id, 'failed', 'Invalid password')
      return response.unauthorized({ message: 'Invalid email or password' })
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!code) {
        return response.ok({
          requiresTwoFactor: true,
          userId: user.id,
          message: 'Two-factor authentication required',
        })
      }

      if (code.includes('-') && user.recoveryCodesEncrypted) {
        const result = TwoFactorService.verifyRecoveryCode(code, user.recoveryCodesEncrypted)
        if (result.valid) {
          user.recoveryCodesEncrypted = TwoFactorService.encryptRecoveryCodes(
            result.remainingCodes
          )
          await user.save()
          await AuditLog.create({
            userId: user.id,
            action: 'user.recovery_code_used',
            resourceType: 'user',
            resourceId: String(user.id),
            ipAddress: request.ip(),
            userAgent: request.header('user-agent'),
            severity: 'warning',
            metadata: { remainingCodes: result.remainingCodes.length },
          })
        } else {
          await this.recordLoginAttempt(request, user.id, 'failed', 'Invalid recovery code')
          return response.unauthorized({ message: 'Invalid verification code' })
        }
      } else {
        if (!user.twoFactorSecretEncrypted) {
          return response.badRequest({ message: '2FA configuration error' })
        }
        const secret = TwoFactorService.decryptSecret(user.twoFactorSecretEncrypted)
        const isValid = TwoFactorService.verifyToken(secret, code)

        if (!isValid.valid) {
          await this.recordLoginAttempt(request, user.id, 'failed', 'Invalid 2FA code')
          return response.unauthorized({ message: 'Invalid verification code' })
        }
      }
    }

    user.failedLoginAttempts = 0
    user.lockedUntil = null
    user.lastLoginAt = DateTime.now()
    await user.save()

    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: '7 days',
    })

    await this.recordLoginAttempt(
      request,
      user.id,
      'success',
      null,
      String(token.identifier)
    )

    await AuditLog.create({
      userId: user.id,
      action: 'user.login',
      resourceType: 'user',
      resourceId: String(user.id),
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
      severity: 'info',
    })

    return response.ok({
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        avatarUrl: user.avatarUrl,
      },
      token: token.value!.release(),
    })
  }

  private async recordLoginAttempt(
    request: HttpContext['request'],
    userId: number | null,
    status: 'success' | 'failed' | 'blocked',
    failureReason: string | null,
    tokenIdentifier?: string
  ) {
    if (!userId) return

    await LoginHistory.create({
      userId,
      tokenIdentifier: tokenIdentifier ?? null,
      ipAddress: request.ip(),
      userAgent: request.header('user-agent') ?? null,
      status,
      failureReason: failureReason ?? null,
      isSuspicious: false,
    })
  }
}
