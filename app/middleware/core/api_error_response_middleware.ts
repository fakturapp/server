import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { normalizeManualErrorResponse } from '#services/http/error_response_service'
import { logRequestError } from '#services/http/request_error_log_service'
import type { ErrorCode } from '#exceptions/error_codes'

const ERROR_METHODS = [
  ['badRequest', 400],
  ['unauthorized', 401],
  ['forbidden', 403],
  ['notFound', 404],
  ['conflict', 409],
  ['unprocessableEntity', 422],
  ['tooManyRequests', 429],
  ['internalServerError', 500],
  ['serviceUnavailable', 503],
] as const

type ResponseWithNamedStatuses = Record<string, (...args: unknown[]) => unknown>

export default class ApiErrorResponseMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    const response = ctx.response as unknown as ResponseWithNamedStatuses

    for (const [methodName, status] of ERROR_METHODS) {
      const original = response[methodName] as ((body?: unknown) => unknown) | undefined
      if (typeof original !== 'function') continue

      response[methodName] = (body?: unknown) => {
        const normalized = normalizeManualErrorResponse(ctx, status, body)
        const errorCode = normalized.error.details.error_code as ErrorCode

        void logRequestError(ctx, {
          status,
          errorCode,
          errorType: normalized.error.type,
        })

        return original.call(response, normalized)
      }
    }

    return next()
  }
}
