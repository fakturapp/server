import AuditLog from '#models/shared/audit_log'
import type { ErrorCode } from '#exceptions/error_codes'
import type { HttpContext } from '@adonisjs/core/http'
import { getRequestId } from '#middleware/core/request_id_middleware'

interface RequestErrorLogOptions {
  status: number
  errorCode: ErrorCode
  errorType: string
}

function getRequestPath(ctx: HttpContext) {
  const rawUrl = ctx.request.request.url || ctx.request.url()
  return rawUrl.split('?')[0].slice(0, 255)
}

function getUserId(ctx: HttpContext) {
  try {
    if ('auth' in ctx && ctx.auth?.user?.id) {
      return ctx.auth.user.id
    }
  } catch {}

  return null
}

export async function logRequestError(ctx: HttpContext, options: RequestErrorLogOptions) {
  if (ctx.apiErrorLogged) return
  ctx.apiErrorLogged = true

  try {
    await AuditLog.create({
      userId: getUserId(ctx),
      action: 'api.request_error',
      resourceType: 'http_request',
      resourceId: getRequestId(ctx) ?? null,
      metadata: {
        method: (ctx.request.request.method || ctx.request.method()).toUpperCase(),
        path: getRequestPath(ctx),
        status: options.status,
        errorType: options.errorType,
        errorCode: options.errorCode,
      },
      ipAddress: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent') || null,
      severity: options.status >= 500 ? 'critical' : 'warning',
    })
  } catch {
    ctx.apiErrorLogged = false
  }
}
