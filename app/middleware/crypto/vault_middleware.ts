import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import keyStore from '#services/crypto/key_store'
import keyStoreWarmer from '#services/crypto/key_store_warmer'
import Team from '#models/team/team'
import TeamMember from '#models/team/team_member'
import teamEncryptionService from '#services/crypto/team_encryption_service'
import { buildStructuredErrorResponse } from '#services/http/error_response_service'
import { logRequestError } from '#services/http/request_error_log_service'

export default class VaultMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user || !user.currentTeamId) {
      return next()
    }

    let dek = keyStore.getDEK(user.id, user.currentTeamId)
    if (dek) {
      ctx.dek = dek
      return next()
    }

    const team = await Team.find(user.currentTeamId)
    if (!team) {
      return next()
    }
    ctx.team = team

    if (team.encryptionMode === 'standard') {
      const membership = await TeamMember.query()
        .where('teamId', team.id)
        .where('userId', user.id)
        .where('status', 'active')
        .first()

      const decrypted = membership
        ? teamEncryptionService.unwrapDekForMembership(team, membership)
        : null

      if (!decrypted) {
        await logRequestError(ctx, {
          status: 500,
          errorCode: 'internal_error',
          errorType: 'team_dek_missing_error',
        })
        return ctx.response.internalServerError(
          buildStructuredErrorResponse(ctx, {
            errorCode: 'internal_error',
            message: 'Unable to resolve the encryption key for this team.',
          })
        )
      }

      keyStore.storeServerDek(user.id, team.id, decrypted)
      ctx.dek = decrypted
      return next()
    }

    const sessionKeyHex = ctx.request.header('X-Vault-Key')
    const warmed = await keyStoreWarmer.warmFromRequest(
      user.id,
      user.currentTeamId,
      String(user.currentAccessToken.identifier),
      sessionKeyHex
    )
    dek = warmed ? keyStore.getDEK(user.id, user.currentTeamId) : null

    if (!dek) {
      await logRequestError(ctx, {
        status: 423,
        errorCode: 'vault_locked',
        errorType: 'vault_locked_error',
      })
      return ctx.response.status(423).send(
        buildStructuredErrorResponse(ctx, {
          errorCode: 'vault_locked',
          message: 'Vault is locked. Please provide your password to unlock.',
        })
      )
    }

    ctx.dek = dek
    return next()
  }
}
