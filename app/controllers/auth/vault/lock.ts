import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import keyStore from '#services/crypto/key_store'

export default class VaultLock {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!

    keyStore.clear(user.id)

    const tokenId = user.currentAccessToken.identifier
    await db.from('auth_access_tokens').where('id', String(tokenId)).update({ encrypted_kek: null })

    return response.ok({ message: 'Vault locked' })
  }
}
