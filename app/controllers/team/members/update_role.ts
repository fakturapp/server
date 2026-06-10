import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import TeamMember from '#models/team/team_member'
import Team from '#models/team/team'
import { notifyUser } from '#services/collaboration/websocket_service'

const updateRoleValidator = vine.compile(
  vine.object({
    role: vine.enum(['viewer', 'member', 'admin']),
  })
)

export default class UpdateRole {
  async handle({ auth, params, request, response }: HttpContext) {
    const user = auth.user!

    if (!user.currentTeamId) {
      return response.notFound({ message: 'No team found' })
    }

    const currentMember = await TeamMember.query()
      .where('teamId', user.currentTeamId)
      .where('userId', user.id)
      .first()

    if (!currentMember || !['super_admin', 'admin'].includes(currentMember.role)) {
      return response.forbidden({ message: 'Only admins can change roles' })
    }

    const targetMember = await TeamMember.query()
      .where('id', params.id)
      .where('teamId', user.currentTeamId)
      .where('status', 'active')
      .first()

    if (!targetMember) {
      return response.notFound({ message: 'Member not found' })
    }

    if (targetMember.role === 'super_admin') {
      return response.forbidden({
        message: 'Cannot change the Super Admin role directly. Use ownership transfer instead.',
      })
    }

    const payload = await request.validateUsing(updateRoleValidator)
    if (payload.role === 'admin' && currentMember.role !== 'super_admin') {
      return response.forbidden({ message: 'Only the Super Admin can promote to Admin' })
    }

    targetMember.role = payload.role
    await targetMember.save()

    if (targetMember.userId) {
      const team = await Team.find(user.currentTeamId)
      notifyUser(targetMember.userId, 'team-role-updated', {
        role: targetMember.role,
        teamId: user.currentTeamId,
        teamName: team?.name ?? null,
      })
    }

    return response.ok({
      message: 'Role updated',
      member: {
        id: targetMember.id,
        role: targetMember.role,
      },
    })
  }
}
