import db from '@adonisjs/lucid/services/db'
import Team from '#models/team/team'
import TeamMember from '#models/team/team_member'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'
import encryptionService from '#services/encryption/encryption_service'
import keyStore from '#services/crypto/key_store'
import teamEncryptionService from '#services/crypto/team_encryption_service'

export class KeyStoreWarmer {
  async warmKekFromRequest(
    userId: string,
    tokenIdentifier: string | null,
    sessionKeyHex: string | null | undefined
  ): Promise<Buffer | null> {
    if (!sessionKeyHex || !tokenIdentifier) return null

    try {
      const tokenRow = await db
        .from('auth_access_tokens')
        .where('id', tokenIdentifier)
        .select('encrypted_kek')
        .first()

      if (!tokenRow?.encrypted_kek) return null

      const sessionKey = Buffer.from(sessionKeyHex, 'hex')
      const layer1 = encryptionService.decrypt(tokenRow.encrypted_kek)
      const kekHex = encryptionService.decryptWithCustomKey(layer1, sessionKey)
      const kek = Buffer.from(kekHex, 'hex')

      keyStore.storeKeys(userId, kek, '', Buffer.alloc(0))
      return kek
    } catch {
      return null
    }
  }

  async warmFromRequest(
    userId: string,
    currentTeamId: string | null,
    tokenIdentifier: string | null,
    sessionKeyHex: string | null | undefined
  ): Promise<boolean> {
    if (!currentTeamId) {
      const kek = await this.warmKekFromRequest(userId, tokenIdentifier, sessionKeyHex)
      return !!kek
    }

    const team = await Team.find(currentTeamId)
    if (!team) return false

    const member = await TeamMember.query()
      .where('teamId', currentTeamId)
      .where('userId', userId)
      .where('status', 'active')
      .first()

    if (team.encryptionMode === 'standard') {
      const dek = member ? teamEncryptionService.unwrapDekForMembership(team, member) : null
      if (!dek) return false
      keyStore.storeServerDek(userId, currentTeamId, dek)
      return true
    }

    const kek = await this.warmKekFromRequest(userId, tokenIdentifier, sessionKeyHex)
    if (!kek) return false

    try {
      const dek = this.decryptPrivateTeamDek(member, kek)
      if (dek) {
        keyStore.storeKeys(userId, kek, currentTeamId, dek)
      }
      return true
    } catch {
      return false
    }
  }

  private decryptPrivateTeamDek(teamMember: TeamMember | null, kek: Buffer): Buffer | null {
    if (!teamMember) {
      return null
    }

    if (teamMember.encryptedTeamDek) {
      try {
        return zeroAccessCryptoService.decryptDEK(teamMember.encryptedTeamDek, kek)
      } catch {}
    }

    if (teamMember.encryptedTeamDekRecovery) {
      try {
        return zeroAccessCryptoService.decryptDEK(teamMember.encryptedTeamDekRecovery, kek)
      } catch {}
    }

    return null
  }
}

export default new KeyStoreWarmer()
