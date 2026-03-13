import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import LoginHistory from '#models/login_history'
import TwoFactorService from '#services/two_factor_service'
import { twoFactorVerifyValidator } from '#validators/auth'

export default class TwoFactorVerifyController {
  async handle({ request, response }: HttpContext) {
    const { code, userId } = await request.validateUsing(twoFactorVerifyValidator)

    const user = await User.find(userId)

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecretEncrypted) {
      return response.badRequest({ message: 'Invalid request' })
    }

    const cleanCode = code.trim().replace(/\s/g, '')

    // Recovery code check
    if (cleanCode.includes('-') && user.recoveryCodesEncrypted) {
      const result = TwoFactorService.verifyRecoveryCode(cleanCode, user.recoveryCodesEncrypted)

      if (result.valid) {
        user.recoveryCodesEncrypted = TwoFactorService.encryptRecoveryCodes(result.remainingCodes)
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

        return this.completeLogin(user, request, response)
      } else {
        await this.recordLoginAttempt(request, user.id, 'failed', 'Invalid recovery code')
        return response.unauthorized({ message: 'Invalid recovery code' })
      }
    }

    // TOTP code check
    const secret = TwoFactorService.decryptSecret(user.twoFactorSecretEncrypted)
    const isValid = TwoFactorService.verifyToken(secret, cleanCode)

    if (!isValid.valid) {
      await this.recordLoginAttempt(request, user.id, 'failed', 'Invalid 2FA code')
      return response.unauthorized({ message: 'Invalid verification code' })
    }

    return this.completeLogin(user, request, response)
  }

  private async completeLogin(
    user: User,
    request: HttpContext['request'],
    response: HttpContext['response']
  ) {
    user.failedLoginAttempts = 0
    user.lockedUntil = null
    user.lastLoginAt = DateTime.now()
    await user.save()

    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: '7 days',
    })

    await this.recordLoginAttempt(request, user.id, 'success', null)

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
    userId: number,
    status: 'success' | 'failed' | 'blocked',
    failureReason: string | null
  ) {
    await LoginHistory.create({
      userId,
      ipAddress: request.ip(),
      userAgent: request.header('user-agent') ?? null,
      status,
      failureReason,
      isSuspicious: false,
    })
  }
}
