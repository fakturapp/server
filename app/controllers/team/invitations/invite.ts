import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import TeamMember from '#models/team/team_member'
import User from '#models/account/user'
import TeamMemberInvited from '#events/team_member_invited'
import env from '#start/env'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'
import keyStore from '#services/crypto/key_store'
import { inviteValidator } from '#validators/team_validator'
import { ApiError } from '#exceptions/api_error'

const INVITATION_TTL_DAYS = 7

export default class Invite {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!

    if (!user.currentTeamId) {
      throw new ApiError('team_not_selected')
    }

    const currentMember = await TeamMember.query()
      .where('teamId', user.currentTeamId)
      .where('userId', user.id)
      .first()

    if (!currentMember || !['super_admin', 'admin'].includes(currentMember.role)) {
      throw new ApiError('permission_team_role_required', {
        message: 'Only admins can invite members',
      })
    }

    const payload = await request.validateUsing(inviteValidator)

    const existingUser = await User.findBy('email', payload.email)
    if (existingUser) {
      const existingMember = await TeamMember.query()
        .where('teamId', user.currentTeamId)
        .where('userId', existingUser.id)
        .first()

      if (existingMember && existingMember.status === 'active') {
        return response.conflict({ message: 'This user is already a member of the team' })
      }
    }

    const existingInvite = await TeamMember.query()
      .where('teamId', user.currentTeamId)
      .where('invitedEmail', payload.email)
      .where('status', 'pending')
      .first()

    if (existingInvite) {
      return response.conflict({ message: 'An invitation is already pending for this email' })
    }

    const token = crypto.randomBytes(32).toString('hex')

    const teamDek = keyStore.getDEK(user.id, user.currentTeamId)
    let encryptedInviteDek: string | null = null
    if (teamDek) {
      const inviteKey = zeroAccessCryptoService.deriveInviteKey(token)
      encryptedInviteDek = zeroAccessCryptoService.encryptDEK(teamDek, inviteKey)
    }

    const now = DateTime.now()
    const member = await TeamMember.create({
      teamId: user.currentTeamId,
      userId: existingUser?.id ?? (null as any),
      role: payload.role,
      status: 'pending',
      invitationToken: token,
      invitedEmail: payload.email,
      invitedAt: now,
      invitationExpiresAt: now.plus({ days: INVITATION_TTL_DAYS }),
      encryptedInviteDek,
    })

    const frontendUrl = env.get('FRONTEND_URL') || 'http://localhost:3000'
    const inviteUrl = `${frontendUrl}/invite/${token}`

    // Send invitation email
    TeamMemberInvited.dispatch(payload.email, user.fullName || user.email, inviteUrl)

    return response.created({
      message: 'Invitation sent',
      invitation: {
        id: member.id,
        email: payload.email,
        role: payload.role,
        inviteUrl,
        token,
      },
    })
  }
}
