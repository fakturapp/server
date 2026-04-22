import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import TeamMember from '#models/team/team_member'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'
import keyStore from '#services/crypto/key_store'
import encryptionService from '#services/encryption/encryption_service'
import { changePasswordValidator } from '#validators/account_validator'
import RecoveryKeyGenerated from '#events/recovery_key_generated'
import recoveryKeyService from '#services/crypto/recovery_key_service'

export default class Password {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(changePasswordValidator)

    const isValid = await hash.verify(user.password, payload.currentPassword)
    if (!isValid) {
      return response.unauthorized({ message: 'Current password is incorrect' })
    }

    const oldKek = user.saltKdf
      ? await zeroAccessCryptoService.deriveKEK(
          payload.currentPassword,
          Buffer.from(user.saltKdf, 'hex')
        )
      : null

    const newSalt = zeroAccessCryptoService.generateSalt()
    const newKek = await zeroAccessCryptoService.deriveKEK(payload.password, newSalt)

    let newRecoveryKey: string | null = null
    if (oldKek) {
      const memberships = await TeamMember.query()
        .where('userId', user.id)
        .where('status', 'active')
        .whereNotNull('encryptedTeamDek')

      for (const membership of memberships) {
        const teamDek = zeroAccessCryptoService.decryptDEK(membership.encryptedTeamDek!, oldKek)
        membership.encryptedTeamDek = zeroAccessCryptoService.encryptDEK(teamDek, newKek)
        await membership.save()

        keyStore.storeDEK(user.id, membership.teamId, teamDek)
      }

      const rotation = await recoveryKeyService.rotateForUser(user, newKek)
      newRecoveryKey = rotation.recoveryKey
    }

    user.password = payload.password
    user.saltKdf = newSalt.toString('hex')

    await user.save()

    if (newRecoveryKey) {
      RecoveryKeyGenerated.dispatch(user.email, newRecoveryKey, user.fullName ?? undefined)
    }

    keyStore.storeKEK(user.id, newKek)

    const sessionKey = crypto.randomBytes(32)
    const layer1 = encryptionService.encryptWithCustomKey(newKek.toString('hex'), sessionKey)
    const layer2 = encryptionService.encrypt(layer1)
    await db
      .from('auth_access_tokens')
      .where('id', String(user.currentAccessToken.identifier))
      .update({ encrypted_kek: layer2 })

    const formatted = newRecoveryKey
      ? zeroAccessCryptoService.formatRecoveryKey(newRecoveryKey)
      : undefined

    return response.ok({
      message: 'Password changed successfully',
      recoveryKey: formatted,
      vaultKey: sessionKey.toString('hex'),
    })
  }
}
