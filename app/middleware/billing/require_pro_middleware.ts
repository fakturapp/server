import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Team from '#models/team/team'
import { isPro } from '#services/billing/plan_entitlements'

export default class RequireProMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const teamId = ctx.auth.user?.currentTeamId
    const team = teamId ? await Team.find(teamId) : null

    if (!team || !isPro(team)) {
      return ctx.response.forbidden({
        message: 'Cette fonctionnalité nécessite Faktur Pro.',
        code: 'PRO_REQUIRED',
      })
    }

    return next()
  }
}
