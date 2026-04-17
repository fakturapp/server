import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { getRequestId } from '#middleware/core/request_id_middleware'
import ApiRequestLog from '#models/analytics/api_request_log'

export default class RequestLogMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const result = await next()

    try {
      const requestId = getRequestId(ctx) || 'unknown'
      const method = ctx.request.method()
      const rawPath = ctx.request.url(true)
      const path = rawPath.split('?')[0].slice(0, 500)
      const statusCode = ctx.response.getStatus()
      let userId: string | null = null
      try {
        userId = ctx.auth?.user?.id ?? null
      } catch {}

      await ApiRequestLog.create({
        userId,
        requestId,
        method,
        path,
        statusCode,
        requestedAt: DateTime.now(),
      })
    } catch {}

    return result
  }
}
