import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import User from '#models/account/user'
import AuditLog from '#models/shared/audit_log'
import LoginHistory from '#models/account/login_history'
import TwoFactorService from '#services/auth/two_factor_service'
import TrustedDeviceService from '#services/auth/trusted_device_service'
import { twoFactorVerifyValidator } from '#validators/auth/auth_validators'
import UserTransformer from '#transformers/user_transformer'
import { realClientIp } from '#services/http/real_client_ip'
import { setAuthTokenCookie, setTrustedDeviceCookie } from '#services/auth/auth_cookie'
import { decodePending } from '#services/auth/two_factor_pending'

export default class Verify {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const clientIp = realClientIp(ctx)
    const data = await request.validateUsing(twoFactorVerifyValidator)

    const resolvedUserId = data.userId || (data.twofaToken ? decodePending(data.twofaToken) : null)
    const user = resolvedUserId ? await User.find(resolvedUserId) : null

    if (!user || !user.twoFactorEnabled) {
      return response.unauthorized({ message: 'Invalid request' })
    }

    const useEmail = data.method === 'email'
    const useRecovery = data.method === 'recovery' || (!useEmail && data.code.includes('-'))

    if (useEmail) {
      const codeHash = crypto.createHash('sha256').update(data.code).digest('hex')
      const storedHash = user.twoFactorEmailCodeHash
      const expiresAt = user.twoFactorEmailCodeExpiresAt

      const matches =
        !!storedHash &&
        codeHash.length === storedHash.length &&
        crypto.timingSafeEqual(Buffer.from(codeHash), Buffer.from(storedHash))

      if (!matches || !expiresAt || expiresAt < DateTime.now()) {
        return response.unauthorized({ message: 'Invalid verification code' })
      }

      user.twoFactorEmailCodeHash = null
      user.twoFactorEmailCodeExpiresAt = null
    } else if (useRecovery) {
      if (!user.recoveryCodesEncrypted) {
        return response.unauthorized({ message: 'Invalid verification code' })
      }
      const result = TwoFactorService.verifyRecoveryCode(data.code, user.recoveryCodesEncrypted)
      if (!result.valid) {
        return response.unauthorized({ message: 'Invalid verification code' })
      }
      user.recoveryCodesEncrypted = TwoFactorService.encryptRecoveryCodes(result.remainingCodes)

      await AuditLog.create({
        userId: user.id,
        action: 'user.recovery_code_used',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: clientIp,
        userAgent: request.header('user-agent'),
        severity: 'warning',
        metadata: { remainingCodes: result.remainingCodes.length },
      })
    } else {
      if (!user.twoFactorSecretEncrypted) {
        return response.badRequest({ message: '2FA configuration error' })
      }
      const secret = TwoFactorService.decryptSecret(user.twoFactorSecretEncrypted)
      const isValid = TwoFactorService.verifyToken(secret, data.code)

      if (!isValid.valid) {
        return response.unauthorized({ message: 'Invalid verification code' })
      }
    }

    user.failedLoginAttempts = 0
    user.lockedUntil = null
    user.lastLoginAt = DateTime.now()
    await user.save()

    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: '15 days',
    })

    await db
      .from('auth_access_tokens')
      .where('id', String(token.identifier))
      .update({
        ip_address: clientIp,
        user_agent: (request.header('user-agent') || '').slice(0, 512),
      })

    await LoginHistory.create({
      userId: user.id,
      tokenIdentifier: String(token.identifier),
      ipAddress: clientIp,
      userAgent: request.header('user-agent') ?? undefined,
      status: 'success',
      isSuspicious: false,
    })

    await AuditLog.create({
      userId: user.id,
      action: 'user.login',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: clientIp,
      userAgent: request.header('user-agent'),
      severity: 'info',
    })

    const tokenValue = token.value!.release()
    setAuthTokenCookie(response, tokenValue)

    if (data.trustDevice === true) {
      const rawToken = TrustedDeviceService.issueToken()
      await TrustedDeviceService.create(user, rawToken, ctx)
      setTrustedDeviceCookie(response, rawToken)
    }

    return response.ok({
      message: 'Login successful',
      user: await ctx.serialize.withoutWrapping(UserTransformer.transform(user)),
      token: tokenValue,
    })
  }
}
