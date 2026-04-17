import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as authErrors } from '@adonisjs/auth'
import { errors as vineErrors } from '@vinejs/vine'
import { ApiError } from './api_error.js'
import { ERROR_CODES, type ErrorCode, type ErrorType, type ErrorVisibility } from './error_codes.js'
import { getRequestId } from '#middleware/core/request_id_middleware'

interface ErrorResponseBody {
  type: 'error'
  error: {
    type: ErrorType
    message: string
    details: Record<string, unknown>
  }
  request_id: string | null
}

function buildResponse(
  status: number,
  errorType: ErrorType,
  message: string,
  code: ErrorCode | string,
  visibility: ErrorVisibility,
  requestId: string | null,
  extraDetails: Record<string, unknown> | null = null
): { status: number; body: ErrorResponseBody } {
  return {
    status,
    body: {
      type: 'error',
      error: {
        type: errorType,
        message,
        details: {
          error_visibility: visibility,
          error_code: code,
          ...extraDetails,
        },
      },
      request_id: requestId,
    },
  }
}

function fallbackResponse(code: ErrorCode, message: string, requestId: string | null, extraDetails: Record<string, unknown> | null = null) {
  const def = ERROR_CODES[code]
  return buildResponse(def.status, def.type, message, code, def.visibility, requestId, extraDetails)
}

function serialize(error: unknown, ctx: HttpContext): { status: number; body: ErrorResponseBody } {
  const requestId = getRequestId(ctx) ?? null

  if (error instanceof ApiError) {
    const def = ERROR_CODES[error.errorCode]
    return buildResponse(
      def.status,
      error.errorType,
      error.message,
      error.errorCode,
      error.visibility,
      requestId,
      error.details as Record<string, unknown> | null
    )
  }

  if (error instanceof vineErrors.E_VALIDATION_ERROR) {
    return fallbackResponse('validation_failed', 'Request validation failed', requestId, { errors: error.messages })
  }

  if (error instanceof authErrors.E_UNAUTHORIZED_ACCESS) {
    return fallbackResponse('account_session_invalid', 'Invalid authorization', requestId)
  }

  if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
    return fallbackResponse('account_credentials_invalid', 'Invalid email or password', requestId)
  }

  if (isObjectWithStatusAndCode(error)) {
    const status = typeof error.status === 'number' ? error.status : 500
    const code = typeof error.code === 'string' ? error.code : 'E_INTERNAL_ERROR'

    if (status === 429 || code === 'E_TOO_MANY_REQUESTS') {
      return fallbackResponse('rate_limit_exceeded', 'Too many requests, please slow down', requestId)
    }

    if (status === 404) {
      return fallbackResponse(
        'resource_not_found',
        typeof error.message === 'string' ? error.message : 'Resource not found',
        requestId
      )
    }

    if (status === 403) {
      return fallbackResponse(
        'permission_denied',
        typeof error.message === 'string' ? error.message : "You don't have permission",
        requestId
      )
    }

    if (status === 400) {
      return fallbackResponse(
        'invalid_request',
        typeof error.message === 'string' ? error.message : 'Invalid request',
        requestId
      )
    }
  }

  const message = app.inProduction
    ? 'An unexpected error occurred'
    : error instanceof Error
      ? error.message
      : String(error)
  const extra =
    app.inProduction || !(error instanceof Error)
      ? null
      : { name: error.name, stack: error.stack?.split('\n').slice(0, 10) }

  return fallbackResponse('internal_error', message, requestId, extra)
}

function isObjectWithStatusAndCode(value: unknown): value is { status?: unknown; code?: unknown; message?: unknown } {
  return typeof value === 'object' && value !== null
}

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    const { status, body } = serialize(error, ctx)
    ctx.response.status(status).send(body)
  }

  async report(error: unknown, ctx: HttpContext) {
    if (error instanceof ApiError && error.visibility === 'user_facing' && (error.status ?? 0) < 500) {
      return
    }
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      return
    }
    if (error instanceof authErrors.E_UNAUTHORIZED_ACCESS) {
      return
    }
    if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
      return
    }
    return super.report(error, ctx)
  }
}
