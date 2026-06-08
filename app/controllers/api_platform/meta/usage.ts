import type { HttpContext } from '@adonisjs/core/http'
import apiResponse from '#services/api/api_response'
import apiCreditService, { creditLimitsFor } from '#services/api/api_credit_service'
import publicIdCodec from '#services/api/public_id_codec'

export default class Usage {
  async handle(ctx: HttpContext) {
    const apiKey = ctx.apiKey!
    const team = ctx.team!
    const limits = creditLimitsFor(team.plan)
    const usage = await apiCreditService.getUsage(apiKey.teamId, team.plan)

    return apiResponse.ok(ctx.response, {
      team: {
        id: publicIdCodec.encode('team', team.id),
        name: team.name,
        plan: team.plan,
      },
      api_key: {
        id: publicIdCodec.encode('api_key', apiKey.id),
        name: apiKey.name,
      },
      limits: {
        per_minute: limits.PER_MINUTE,
        per_session: limits.PER_SESSION,
        session_hours: limits.SESSION_HOURS,
        per_week: limits.PER_WEEK,
        weekly_days: limits.WEEKLY_DAYS,
      },
      session: usage.session,
      weekly: usage.weekly,
      per_minute: usage.per_minute,
      timestamp: new Date().toISOString(),
    })
  }
}
