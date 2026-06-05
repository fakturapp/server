import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/account/user'
import AuditLog from '#models/shared/audit_log'
import { decodePending } from '#services/auth/two_factor_pending'
import { realClientIp } from '#services/http/real_client_ip'

const GENERIC_MESSAGE =
  'Un administrateur a ete notifie. Contactez le support pour recuperer l acces.'

export default class LostCode {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const clientIp = realClientIp(ctx)
    const { userId, twofaToken } = request.only(['userId', 'twofaToken'])

    const resolvedUserId = userId || (twofaToken ? decodePending(twofaToken) : null)
    const user = resolvedUserId ? await User.find(resolvedUserId) : null

    if (user) {
      await AuditLog.create({
        userId: user.id,
        action: 'user.2fa_lost',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: clientIp,
        userAgent: request.header('user-agent'),
        severity: 'warning',
      })
    }

    return response.ok({ message: GENERIC_MESSAGE })
  }
}
