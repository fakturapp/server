import type User from '#models/account/user'
import TeamMember from '#models/team/team_member'
import keyStore from '#services/crypto/key_store'
import keyStoreWarmer from '#services/crypto/key_store_warmer'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'

type HeaderReader = {
  header(name: string): string | undefined | null
}

type AuthenticatedUser = User & {
  currentAccessToken?: {
    identifier?: string | number
  }
}

class SessionKekResolver {
  async resolve(user: User, request: HeaderReader): Promise<Buffer | null> {
    const existingKek = keyStore.getKEK(user.id)
    if (existingKek) {
      return existingKek
    }

    const tokenIdentifier = (user as AuthenticatedUser).currentAccessToken?.identifier
    if (!tokenIdentifier) {
      return null
    }

    return keyStoreWarmer.warmKekFromRequest(
      user.id,
      String(tokenIdentifier),
      request.header('X-Vault-Key')
    )
  }

  async resolvePrimary(user: User, request: HeaderReader): Promise<Buffer | null> {
    const kek = await this.resolve(user, request)
    if (!kek) {
      return null
    }

    if (!user.currentTeamId) {
      return kek
    }

    const membership = await TeamMember.query()
      .where('teamId', user.currentTeamId)
      .where('userId', user.id)
      .where('status', 'active')
      .first()

    if (!membership?.encryptedTeamDek) {
      return kek
    }

    try {
      zeroAccessCryptoService.decryptDEK(membership.encryptedTeamDek, kek)
      return kek
    } catch {
      return null
    }
  }
}

export default new SessionKekResolver()
