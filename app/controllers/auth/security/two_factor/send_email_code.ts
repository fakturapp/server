import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import User from '#models/account/user'
import TwoFactorCodeRequested from '#events/two_factor_code_requested'
import { decodePending } from '#services/auth/two_factor_pending'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) {
    return email
  }
  const visible = local.slice(0, 1)
  return `${visible}****@${domain}`
}

export default class SendEmailCode {
  async handle({ request, response }: HttpContext) {
    const { userId, twofaToken } = request.only(['userId', 'twofaToken'])

    const resolvedUserId = userId || (twofaToken ? decodePending(twofaToken) : null)
    const user = resolvedUserId ? await User.find(resolvedUserId) : null

    if (!user || !user.twoFactorEnabled) {
      return response.badRequest({ message: 'Invalid request' })
    }

    const code = String(crypto.randomInt(100000, 999999))

    user.twoFactorEmailCodeHash = crypto.createHash('sha256').update(code).digest('hex')
    user.twoFactorEmailCodeExpiresAt = DateTime.now().plus({ minutes: 10 })
    await user.save()

    TwoFactorCodeRequested.dispatch(user.email, code, user.fullName ?? undefined)

    return response.ok({ ok: true, email: maskEmail(user.email) })
  }
}
