import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import TeamMember from '#models/team/team_member'
import Team from '#models/team/team'
import User from '#models/account/user'
import TeamMemberInvited from '#events/team_member_invited'
import env from '#start/env'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'
import keyStore from '#services/crypto/key_store'
import teamEncryptionService from '#services/crypto/team_encryption_service'
import { collaborationEnabled, memberLimit } from '#services/billing/plan_entitlements'
import { inviteValidator } from '#validators/team_validator'

export default class Invite {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!

    if (!user.currentTeamId) {
      return response.notFound({ message: 'No team found' })
    }

    const team = await Team.find(user.currentTeamId)
    if (!team) {
      return response.notFound({ message: 'No team found' })
    }

    const currentMember = await TeamMember.query()
      .where('teamId', user.currentTeamId)
      .where('userId', user.id)
      .first()

    if (!currentMember || !['super_admin', 'admin'].includes(currentMember.role)) {
      return response.forbidden({ message: 'Only admins can invite members' })
    }

    if (!collaborationEnabled(team)) {
      return response.forbidden({
        message: 'La collaboration en équipe est réservée au plan Team.',
        code: 'TEAM_REQUIRED',
      })
    }

    const activeCount = await TeamMember.query()
      .where('teamId', user.currentTeamId)
      .where('status', 'active')
      .count('* as total')
      .first()
    if (Number(activeCount?.$extras.total ?? 0) >= memberLimit(team)) {
      return response.forbidden({
        message: `Votre plan permet au maximum ${memberLimit(team)} membres.`,
        code: 'MEMBER_LIMIT_REACHED',
      })
    }

    const payload = await request.validateUsing(inviteValidator)

    let existingUser: User | null = null
    let inviteEmail = payload.email?.toLowerCase() ?? null
    if (payload.userId) {
      existingUser = await User.find(payload.userId)
      if (!existingUser) {
        return response.notFound({ message: 'Utilisateur introuvable' })
      }
      inviteEmail = existingUser.email.toLowerCase()
    } else if (inviteEmail) {
      existingUser = await User.findBy('email', inviteEmail)
    }

    if (!inviteEmail) {
      return response.unprocessableEntity({ message: 'Une adresse email est requise' })
    }

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
      .where('invitedEmail', inviteEmail)
      .where('status', 'pending')
      .first()

    if (existingInvite) {
      return response.conflict({ message: 'An invitation is already pending for this email' })
    }

    const token = crypto.randomBytes(32).toString('hex')

    const teamDek = keyStore.getDEK(user.id, user.currentTeamId)
    let encryptedInviteDek: string | null = null
    let encryptedTeamDek: string | null = null

    if (team.encryptionMode === 'standard') {
      if (!teamDek) {
        return response.internalServerError({
          message: "Impossible de résoudre la clef de l'équipe pour cette invitation.",
        })
      }
      encryptedTeamDek = teamEncryptionService.wrapDekForTeam(team, teamDek)
    } else if (teamDek) {
      const inviteKey = zeroAccessCryptoService.deriveInviteKey(token)
      encryptedInviteDek = zeroAccessCryptoService.encryptDEK(teamDek, inviteKey)
    }

    const member = await TeamMember.create({
      teamId: user.currentTeamId,
      userId: existingUser?.id ?? (null as any),
      role: payload.role,
      status: 'pending',
      invitationToken: token,
      invitedEmail: inviteEmail,
      invitedAt: DateTime.now(),
      encryptedInviteDek,
      encryptedTeamDek,
      dekVersion: 1,
    })

    const accountUrl = env.get('ACCOUNT_URL') || env.get('FRONTEND_URL') || 'http://localhost:3000'
    const inviteUrl = `${accountUrl}/invite/${token}`

    // Send invitation email
    TeamMemberInvited.dispatch(inviteEmail, user.fullName || user.email, inviteUrl)

    return response.created({
      message: 'Invitation sent',
      invitation: {
        id: member.id,
        email: inviteEmail,
        role: payload.role,
        inviteUrl,
        token,
      },
    })
  }
}
