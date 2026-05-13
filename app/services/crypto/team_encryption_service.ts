import type Team from '#models/team/team'
import type TeamMember from '#models/team/team_member'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'
import encryptionService from '#services/encryption/encryption_service'

export type EncryptionMode = 'private' | 'standard'

export interface WrapContext {
  userKek?: Buffer
}

class TeamEncryptionService {
  /**
   * Wrap a DEK for storage on a TeamMember row, branching by team mode.
   * - 'private': AES-GCM(dek, userKek). userKek MUST be provided.
   * - 'standard': server-side wrap using EncryptionService master key.
   */
  wrapDekForTeam(team: Team, dek: Buffer, ctx: WrapContext = {}): string {
    if (team.encryptionMode === 'standard') {
      return encryptionService.encrypt(dek.toString('hex'))
    }
    if (!ctx.userKek) {
      throw new Error('userKek is required to wrap a DEK for a private-mode team')
    }
    return zeroAccessCryptoService.encryptDEK(dek, ctx.userKek)
  }

  /**
   * Unwrap a DEK from a TeamMember row, branching by team mode.
   * Returns null if no wrap exists or decryption fails.
   */
  unwrapDekForMembership(
    team: Team,
    membership: Pick<TeamMember, 'encryptedTeamDek'>,
    ctx: WrapContext = {}
  ): Buffer | null {
    if (!membership.encryptedTeamDek) return null
    try {
      if (team.encryptionMode === 'standard') {
        const hex = encryptionService.decrypt(membership.encryptedTeamDek)
        return Buffer.from(hex, 'hex')
      }
      if (!ctx.userKek) return null
      return zeroAccessCryptoService.decryptDEK(membership.encryptedTeamDek, ctx.userKek)
    } catch {
      return null
    }
  }

  /**
   * True when DEK access requires a user KEK (i.e. private mode).
   * Standard-mode teams are always unlockable by the server alone.
   */
  requiresUserKek(team: Team): boolean {
    return team.encryptionMode === 'private'
  }
}

export default new TeamEncryptionService()
