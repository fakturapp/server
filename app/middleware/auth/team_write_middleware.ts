import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import TeamMember from '#models/team/team_member'

export default class TeamWriteMiddleware {
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

    if (member && member.role === 'viewer') {
      return ctx.response.forbidden({
        message:
          "Votre rôle est en lecture seule. Contactez un administrateur de l'équipe pour effectuer cette action.",
        code: 'permission_team_role_required',
      })
    }

    return next()
  }
}
