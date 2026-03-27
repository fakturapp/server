import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import User from '#models/account/user'
import TeamMember from '#models/team/team_member'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'
import keyStore from '#services/crypto/key_store'
import RecoveryKeyGenerated from '#events/recovery_key_generated'

const setupValidator = vine.compile(
  vine.object({
    password: vine.string(),
  })
)

export default class SetupRecoveryKey {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { password } = await request.validateUsing(setupValidator)

    if (user.hasRecoveryKey) {
      return response.badRequest({ message: 'Recovery key already set up' })
    }

    // Verify password
    const passwordValid = await User.verifyCredentials(user.email, password)
      .then(() => true)
      .catch(() => false)

    if (!passwordValid) {
      return response.unauthorized({ message: 'Mot de passe incorrect' })
    }

    // Get KEK from memory or derive it
    let kek = keyStore.getKEK(user.id)
    if (!kek) {
      if (!user.saltKdf) {
        return response.badRequest({ message: 'No encryption salt found for this account' })
      }
      kek = await zeroAccessCryptoService.deriveKEK(password, Buffer.from(user.saltKdf, 'hex'))
    }

    // Generate recovery key and derive recovery KEK
    const recoveryKey = zeroAccessCryptoService.generateRecoveryKey()
    const recoveryKEK = zeroAccessCryptoService.deriveRecoveryKEK(recoveryKey)

    // Encrypt all team DEKs with recovery KEK
    const memberships = await TeamMember.query()
      .where('userId', user.id)
      .where('status', 'active')
      .whereNotNull('encryptedTeamDek')

    for (const membership of memberships) {
      const teamDek = zeroAccessCryptoService.decryptDEK(membership.encryptedTeamDek!, kek)
      membership.encryptedTeamDekRecovery = zeroAccessCryptoService.encryptDEK(teamDek, recoveryKEK)
      await membership.save()
    }

    // Save hash and flag
    user.recoveryKeyHash = zeroAccessCryptoService.hashRecoveryKey(recoveryKey)
    user.hasRecoveryKey = true
    await user.save()

    // Send email with recovery key
    RecoveryKeyGenerated.dispatch(user.email, recoveryKey, user.fullName ?? undefined)

    const formatted = zeroAccessCryptoService.formatRecoveryKey(recoveryKey)

    return response.ok({ message: 'Recovery key sent by email', recoveryKey: formatted })
  }
}
