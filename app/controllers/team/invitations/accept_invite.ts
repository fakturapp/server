import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'
import TeamMember from '#models/team/team_member'
import Team from '#models/team/team'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'
import keyStore from '#services/crypto/key_store'
import { ApiError } from '#exceptions/api_error'
import { logTeamAction } from '#services/audit/team_audit_log'

const acceptInviteValidator = vine.compile(
  vine.object({
    token: vine.string().trim(),
  })
)

export default class AcceptInvite {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const payload = await request.validateUsing(acceptInviteValidator)

    const invitation = await TeamMember.query()
      .where('invitationToken', payload.token)
      .where('status', 'pending')
      .first()

    if (!invitation) {
      throw new ApiError('invalid_token', { message: 'Invalid or expired invitation' })
    }

    if (invitation.invitationExpiresAt && invitation.invitationExpiresAt < DateTime.now()) {
      invitation.invitationToken = null
      await invitation.save()
      throw new ApiError('invalid_token', { message: 'Invitation has expired' })
    }

    if (invitation.invitedEmail && invitation.invitedEmail !== user.email) {
      throw new ApiError('permission_denied', {
        message: 'This invitation was sent to a different email address',
      })
    }

    const existingMember = await TeamMember.query()
      .where('teamId', invitation.teamId)
      .where('userId', user.id)
      .where('status', 'active')
      .first()

    if (existingMember) {
      await invitation.delete()
      return response.conflict({ message: 'You are already a member of this team' })
    }

    let encryptedTeamDek: string | null = null
    const kek = keyStore.getKEK(user.id)

    if (invitation.encryptedInviteDek && kek) {
      const inviteKey = zeroAccessCryptoService.deriveInviteKey(payload.token)
      const teamDek = zeroAccessCryptoService.decryptDEK(invitation.encryptedInviteDek, inviteKey)
      encryptedTeamDek = zeroAccessCryptoService.encryptDEK(teamDek, kek)

      keyStore.storeDEK(user.id, invitation.teamId, teamDek)
    }

    invitation.userId = user.id
    invitation.status = 'active'
    invitation.joinedAt = DateTime.now()
    invitation.invitationToken = null
    invitation.encryptedInviteDek = null
    invitation.encryptedTeamDek = encryptedTeamDek
    await invitation.save()

    user.currentTeamId = invitation.teamId
    await user.save()

    const team = await Team.findOrFail(invitation.teamId)

    await logTeamAction(ctx, 'team.invite_accepted', {
      teamId: invitation.teamId,
      severity: 'info',
      metadata: { memberId: invitation.id, role: invitation.role },
    })

    return response.ok({
      message: 'Invitation accepted',
      team: {
        id: team.id,
        name: team.name,
      },
    })
  }
}
