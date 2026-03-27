import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import TeamMember from '#models/team/team_member'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'
import keyStore from '#services/crypto/key_store'
import { changePasswordValidator } from '#validators/account_validator'
import RecoveryKeyGenerated from '#events/recovery_key_generated'

export default class Password {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(changePasswordValidator)

    const isValid = await hash.verify(user.password, payload.currentPassword)
    if (!isValid) {
      return response.unauthorized({ message: 'Current password is incorrect' })
    }

    // Derive old KEK to decrypt existing DEKs
    const oldKek = user.saltKdf
      ? await zeroAccessCryptoService.deriveKEK(
          payload.currentPassword,
          Buffer.from(user.saltKdf, 'hex')
        )
      : null

    // Generate new salt and derive new KEK
    const newSalt = zeroAccessCryptoService.generateSalt()
    const newKek = await zeroAccessCryptoService.deriveKEK(payload.password, newSalt)

    // Re-encrypt all team DEKs with new KEK + regenerate recovery key
    let newRecoveryKey: string | null = null
    if (oldKek) {
      const memberships = await TeamMember.query()
        .where('userId', user.id)
        .where('status', 'active')
        .whereNotNull('encryptedTeamDek')

      // Generate new recovery key for all memberships
      newRecoveryKey = zeroAccessCryptoService.generateRecoveryKey()
      const newRecoveryKEK = zeroAccessCryptoService.deriveRecoveryKEK(newRecoveryKey)

      for (const membership of memberships) {
        const teamDek = zeroAccessCryptoService.decryptDEK(membership.encryptedTeamDek!, oldKek)
        membership.encryptedTeamDek = zeroAccessCryptoService.encryptDEK(teamDek, newKek)
        membership.encryptedTeamDekRecovery = zeroAccessCryptoService.encryptDEK(
          teamDek,
          newRecoveryKEK
        )
        await membership.save()

        // Update cached DEK
        keyStore.storeDEK(user.id, membership.teamId, teamDek)
      }
    }

    // Update user password and salt
    user.password = payload.password
    user.saltKdf = newSalt.toString('hex')

    // Update recovery key hash
    if (newRecoveryKey) {
      user.recoveryKeyHash = zeroAccessCryptoService.hashRecoveryKey(newRecoveryKey)
      user.hasRecoveryKey = true
    }

    await user.save()

    // Send new recovery key by email
    if (newRecoveryKey) {
      RecoveryKeyGenerated.dispatch(user.email, newRecoveryKey, user.fullName ?? undefined)
    }

    // Update KEK in memory
    if (user.currentTeamId) {
      const currentDek = keyStore.getDEK(user.id, user.currentTeamId)
      if (currentDek) {
        keyStore.storeKeys(user.id, newKek, user.currentTeamId, currentDek)
      }
    }

    return response.ok({ message: 'Password changed successfully' })
  }
}
