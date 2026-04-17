import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import TeamMember from '#models/team/team_member'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'
import encryptionService from '#services/encryption/encryption_service'
import keyStore from '#services/crypto/key_store'
import RecoveryKeyGenerated from '#events/recovery_key_generated'

export default class CryptoSoftReset {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { password } = request.only(['password'])

    if (!password) {
      return response.badRequest({ message: 'Password is required' })
    }

    const { default: User } = await import('#models/account/user')
    const valid = await User.verifyCredentials(user.email, password)
      .then(() => true)
      .catch(() => false)

    if (!valid) {
      return response.unauthorized({ message: 'Mot de passe incorrect' })
    }

    if (!user.saltKdf) {
      const salt = zeroAccessCryptoService.generateSalt()
      user.saltKdf = salt.toString('hex')
    }

    const salt = Buffer.from(user.saltKdf, 'hex')
    const kek = await zeroAccessCryptoService.deriveKEK(password, salt)

    const memberships = await TeamMember.query()
      .where('userId', user.id)
      .where('status', 'active')

    const newRecoveryKey = zeroAccessCryptoService.generateRecoveryKey()
    const recoveryKEK = zeroAccessCryptoService.deriveRecoveryKEK(newRecoveryKey)

    for (const membership of memberships) {
      const teamDek = crypto.randomBytes(32)

      membership.encryptedTeamDek = zeroAccessCryptoService.encryptDEK(teamDek, kek)
      membership.encryptedTeamDekRecovery = zeroAccessCryptoService.encryptDEK(teamDek, recoveryKEK)
      await membership.save()

      keyStore.storeDEK(user.id, membership.teamId, teamDek)

      await db.from('invoice_settings').where('team_id', membership.teamId).update({
        stripe_publishable_key: null,
        stripe_secret_key: null,
        stripe_webhook_secret: null,
        stripe_webhook_secret_app: null,
        pdp_api_key: null,
      })
    }

    user.cryptoResetNeeded = false
    user.oldSaltKdf = null
    user.hasRecoveryKey = true
    user.recoveryKeyHash = zeroAccessCryptoService.hashRecoveryKey(newRecoveryKey)
    await user.save()

    keyStore.storeKeys(user.id, kek, user.currentTeamId || '', Buffer.alloc(0))
    if (user.currentTeamId) {
      const currentDek = keyStore.getDEK(user.id, user.currentTeamId)
      if (currentDek) {
        keyStore.storeKeys(user.id, kek, user.currentTeamId, currentDek)
      }
    }

    const tokenId = user.currentAccessToken.identifier
    const sessionKey = crypto.randomBytes(32)
    const layer1 = encryptionService.encryptWithCustomKey(kek.toString('hex'), sessionKey)
    const layer2 = encryptionService.encrypt(layer1)
    await db.from('auth_access_tokens').where('id', String(tokenId)).update({ encrypted_kek: layer2 })

    RecoveryKeyGenerated.dispatch(user.email, newRecoveryKey, user.fullName ?? undefined)

    return response.ok({
      message: 'Coffre-fort re-initialise. Les cles API (Stripe, PDP) ont ete reinitialises.',
      vaultKey: sessionKey.toString('hex'),
      recoveryKey: zeroAccessCryptoService.formatRecoveryKey(newRecoveryKey),
    })
  }
}
