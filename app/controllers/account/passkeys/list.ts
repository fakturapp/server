import type { HttpContext } from '@adonisjs/core/http'
import PasskeyCredential from '#models/account/passkey_credential'

export default class List {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!

    const passkeys = await PasskeyCredential.query()
      .where('userId', user.id)
      .orderBy('createdAt', 'desc')

    return response.ok({
      passkeys: passkeys.map((p) => ({
        id: p.id,
        friendlyName: p.friendlyName,
        backedUp: p.backedUp,
        lastUsedAt: p.lastUsedAt,
        createdAt: p.createdAt,
      })),
    })
  }
}
