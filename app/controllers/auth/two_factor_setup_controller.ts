import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import TwoFactorService from '#services/two_factor_service'
import EmailService from '#services/email_service'
import { twoFactorSetupValidator } from '#validators/auth'

export default class TwoFactorSetupController {
  /**
   * Step 1: Generate secret and QR code
   */
  async setup({ auth, response }: HttpContext) {
    const user = auth.user!

    if (user.twoFactorEnabled) {
      return response.badRequest({ message: 'Two-factor authentication is already enabled' })
    }

    const secret = TwoFactorService.generateSecret(user.email)
    const qrCode = await TwoFactorService.generateQRCode(secret.otpauth_url)

    user.twoFactorSecretEncrypted = TwoFactorService.encryptSecret(secret.base32)
    await user.save()

    return response.ok({
      secret: secret.base32,
      qrCode,
      message: 'Scan the QR code with your authenticator app, then verify with a code',
    })
  }

  /**
   * Step 2: Verify code and enable 2FA
   */
  async confirm({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { code } = await request.validateUsing(twoFactorSetupValidator)

    if (user.twoFactorEnabled) {
      return response.badRequest({ message: 'Two-factor authentication is already enabled' })
    }

    if (!user.twoFactorSecretEncrypted) {
      return response.badRequest({ message: 'Please set up 2FA first' })
    }

    const secret = TwoFactorService.decryptSecret(user.twoFactorSecretEncrypted)
    const isValid = TwoFactorService.verifyToken(secret, code)

    if (!isValid.valid) {
      return response.unauthorized({ message: 'Invalid verification code' })
    }

    const recoveryCodes = TwoFactorService.generateRecoveryCodes()

    user.twoFactorEnabled = true
    user.recoveryCodesEncrypted = TwoFactorService.encryptRecoveryCodes(recoveryCodes)
    await user.save()

    await AuditLog.create({
      userId: user.id,
      action: 'user.2fa_enabled',
      resourceType: 'user',
      resourceId: String(user.id),
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
      severity: 'info',
    })

    await EmailService.sendTwoFactorEnabledEmail(user.email, user.fullName || undefined)

    return response.ok({
      message: 'Two-factor authentication enabled successfully',
      recoveryCodes,
    })
  }

  /**
   * Disable 2FA
   */
  async disable({ auth, request, response }: HttpContext) {
    const user = auth.user! as User

    if (!user.twoFactorEnabled) {
      return response.badRequest({ message: 'Two-factor authentication is not enabled' })
    }

    user.twoFactorEnabled = false
    user.twoFactorSecretEncrypted = null
    user.recoveryCodesEncrypted = null
    await user.save()

    await AuditLog.create({
      userId: user.id,
      action: 'user.2fa_disabled',
      resourceType: 'user',
      resourceId: String(user.id),
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
      severity: 'warning',
    })

    return response.ok({ message: 'Two-factor authentication disabled' })
  }
}
