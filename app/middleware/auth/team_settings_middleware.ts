import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import TeamMember from '#models/team/team_member'

const ALLOWED_ROLES = ['super_admin', 'admin']

export default class TeamSettingsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user) {
      return next()
    }

    const method = ctx.request.method().toUpperCase()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return next()
    }

    const teamId = user.currentTeamId
    if (!teamId) {
      return next()
    }

    const member = await TeamMember.query()
      .where('teamId', teamId)
      .where('userId', user.id)
      .where('status', 'active')
      .first()

    if (!member || !ALLOWED_ROLES.includes(member.role)) {
      return ctx.response.forbidden({
        message:
          "Vous n'avez pas les permissions pour modifier ces paramètres. Contactez un administrateur de l'équipe.",
        code: 'permission_team_role_required',
      })
    }

    return next()
  }
}
