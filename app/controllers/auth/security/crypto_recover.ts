import type { HttpContext } from '@adonisjs/core/http'
import TeamMember from '#models/team/team_member'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'
import keyStore from '#services/crypto/key_store'
import RecoveryKeyGenerated from '#events/recovery_key_generated'

/**
 * POST /auth/crypto/recover
 * User provides their OLD password OR recovery key to re-encrypt DEKs with new KEK.
 * This preserves all encrypted data after a password reset.
 */
export default class CryptoRecover {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!

    if (!user.cryptoResetNeeded) {
      return response.badRequest({ message: 'No crypto recovery needed' })
    }

    const { oldPassword, recoveryKey } = request.only(['oldPassword', 'recoveryKey'])

    if (!oldPassword && !recoveryKey) {
      return response.badRequest({ message: 'Old password or recovery key is required' })
    }

    // Get new KEK from memory (stored during login with new password)
    const newKek = keyStore.getKEK(user.id)
    if (!newKek) {
      return response.unauthorized({
        code: 'SESSION_EXPIRED',
        message: 'Session expired. Please log in again.',
      })
    }

    const memberships = await TeamMember.query()
      .where('userId', user.id)
      .where('status', 'active')

    if (recoveryKey) {
      // Recovery key flow: decrypt DEKs from recovery column
      const normalizedKey = recoveryKey.replace(/-/g, '').toUpperCase()
      const recoveryKEK = zeroAccessCryptoService.deriveRecoveryKEK(normalizedKey)

      const membershipsWithRecovery = memberships.filter((m) => m.encryptedTeamDekRecovery)
      if (membershipsWithRecovery.length === 0) {
        return response.badRequest({
          message: 'Aucune clef de secours configurée pour ce compte',
        })
      }

      try {
        for (const membership of membershipsWithRecovery) {
          const teamDek = zeroAccessCryptoService.decryptDEK(
            membership.encryptedTeamDekRecovery!,
            recoveryKEK
          )
          // Re-encrypt with new password KEK
          membership.encryptedTeamDek = zeroAccessCryptoService.encryptDEK(teamDek, newKek)

          // Generate new recovery key and re-encrypt recovery copy
          const newRecoveryKey = zeroAccessCryptoService.generateRecoveryKey()
          const newRecoveryKEK = zeroAccessCryptoService.deriveRecoveryKEK(newRecoveryKey)
          membership.encryptedTeamDekRecovery = zeroAccessCryptoService.encryptDEK(
            teamDek,
            newRecoveryKEK
          )
          await membership.save()

          keyStore.storeDEK(user.id, membership.teamId, teamDek)

          // Update user recovery key hash (use the last generated key)
          user.recoveryKeyHash = zeroAccessCryptoService.hashRecoveryKey(newRecoveryKey)
          RecoveryKeyGenerated.dispatch(user.email, newRecoveryKey, user.fullName ?? undefined)
        }
      } catch {
        return response.unprocessableEntity({
          message: 'Clef de secours incorrecte. Impossible de déchiffrer vos données.',
        })
      }
    } else {
      // Old password flow (existing behavior)
      if (!user.oldSaltKdf) {
        return response.badRequest({
          message: 'Recovery data not available. Please start fresh.',
        })
      }

      const oldSalt = Buffer.from(user.oldSaltKdf, 'hex')
      let oldKek: Buffer
      try {
        oldKek = await zeroAccessCryptoService.deriveKEK(oldPassword, oldSalt)
      } catch {
        return response.badRequest({ message: 'Failed to derive key from old password' })
      }

      const membershipsWithDek = memberships.filter((m) => m.encryptedTeamDek)

      try {
        for (const membership of membershipsWithDek) {
          const teamDek = zeroAccessCryptoService.decryptDEK(membership.encryptedTeamDek!, oldKek)
          membership.encryptedTeamDek = zeroAccessCryptoService.encryptDEK(teamDek, newKek)

          // Also re-encrypt recovery copy if it exists
          if (membership.encryptedTeamDekRecovery) {
            const newRecoveryKey = zeroAccessCryptoService.generateRecoveryKey()
            const newRecoveryKEK = zeroAccessCryptoService.deriveRecoveryKEK(newRecoveryKey)
            membership.encryptedTeamDekRecovery = zeroAccessCryptoService.encryptDEK(
              teamDek,
              newRecoveryKEK
            )
            user.recoveryKeyHash = zeroAccessCryptoService.hashRecoveryKey(newRecoveryKey)
            RecoveryKeyGenerated.dispatch(user.email, newRecoveryKey, user.fullName ?? undefined)
          }

          await membership.save()
          keyStore.storeDEK(user.id, membership.teamId, teamDek)
        }
      } catch {
        return response.unprocessableEntity({
          message: 'Ancien mot de passe incorrect. Impossible de déchiffrer vos données.',
        })
      }
    }

    // Clear crypto reset flag
    user.cryptoResetNeeded = false
    user.oldSaltKdf = null
    await user.save()

    // Reload current team DEK if needed
    if (user.currentTeamId) {
      const dek = keyStore.getDEK(user.id, user.currentTeamId)
      if (dek) {
        keyStore.storeKeys(user.id, newKek, user.currentTeamId, dek)
      }
    }

    return response.ok({ message: 'Données récupérées avec succès' })
  }
}
