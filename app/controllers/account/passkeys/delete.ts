import type { HttpContext } from '@adonisjs/core/http'
import PasskeyCredential from '#models/account/passkey_credential'
import AuditLog from '#models/shared/audit_log'

export default class Delete {
  async handle({ auth, params, request, response }: HttpContext) {
    const user = auth.user!

    const passkey = await PasskeyCredential.query()
      .where('id', params.id)
      .where('userId', user.id)
      .first()

    if (!passkey) {
      return response.notFound({ message: 'Passkey not found' })
    }

    const name = passkey.friendlyName

    await passkey.delete()

    await AuditLog.create({
      userId: user.id,
      action: 'user.passkey_deleted',
      resourceType: 'passkey_credential',
      resourceId: params.id,
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
      severity: 'warning',
      metadata: { friendlyName: name },
    })

    return response.ok({ message: 'Passkey deleted' })
  }
}
