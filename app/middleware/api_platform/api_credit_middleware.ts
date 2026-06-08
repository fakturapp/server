import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import apiCreditService, { creditLimitsFor } from '#services/api/api_credit_service'
import { creditCostFor } from '#services/api/api_credit_cost'
import apiResponse from '#services/api/api_response'

const SKIP_PATH_SUFFIXES = [
  '/ping',
  '/session',
  '/usage',
  '/openapi.json',
  '/openapi.yaml',
  '/openapi',
  '/docs',
  '/health',
]

export default class ApiCreditMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const apiKey = ctx.apiKey
    if (!apiKey) return next()

    const path = ctx.request.url(true)
    if (SKIP_PATH_SUFFIXES.some((suffix) => path.endsWith(suffix))) {
      return next()
    }

    const teamId = apiKey.teamId
    const userId =
      (apiKey as unknown as { createdByUserId?: string | null }).createdByUserId ?? null
    const plan = ctx.team?.plan ?? 'free'
    const limits = creditLimitsFor(plan)
    const cost = creditCostFor(ctx.request.method(), ctx.request.url())

    const check = await apiCreditService.check(teamId, userId, plan, cost)

    ctx.response.header('X-Credits-Cost', String(cost))
    ctx.response.header('X-Credits-Session-Limit', String(limits.PER_SESSION))
    ctx.response.header('X-Credits-Session-Window-Hours', String(limits.SESSION_HOURS))
    ctx.response.header('X-Credits-Weekly-Limit', String(limits.PER_WEEK))
    ctx.response.header('X-Credits-Per-Minute-Limit', String(limits.PER_MINUTE))

    if (!check.ok) {
      ctx.response.header('Retry-After', String(check.retry_after_seconds))
      return apiResponse.rateLimited(
        ctx.response,
        check.retry_after_seconds,
        {
          reason: check.reason,
          retry_after_seconds: check.retry_after_seconds,
          cost,
          limits: {
            per_minute: limits.PER_MINUTE,
            per_session: limits.PER_SESSION,
            session_hours: limits.SESSION_HOURS,
            per_week: limits.PER_WEEK,
          },
        },
        ctx.requestId
      )
    }

    ctx.response.header('X-Credits-Session-Remaining', String(check.session_remaining))
    ctx.response.header('X-Credits-Weekly-Remaining', String(check.weekly_remaining))
    ctx.response.header('X-Credits-Minute-Remaining', String(check.minute_remaining))

    await apiCreditService.charge(teamId, userId, cost)
    return next()
  }
}
