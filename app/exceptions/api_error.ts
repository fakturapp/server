import { Exception } from '@adonisjs/core/exceptions'
import { ERROR_CODES, type ErrorCode, type ErrorVisibility } from '#exceptions/error_codes'

export interface ApiErrorOptions {
  message?: string
  details?: Record<string, unknown> | null
  cause?: unknown
}

export class ApiError extends Exception {
  declare errorCode: ErrorCode
  declare errorType: string
  declare visibility: ErrorVisibility
  declare details: Record<string, unknown> | null

  constructor(code: ErrorCode, options: ApiErrorOptions = {}) {
    const definition = ERROR_CODES[code]

    super(options.message ?? definition.defaultMessage, {
      status: definition.status,
      code: code.toUpperCase(),
    })

    this.errorCode = code
    this.errorType = definition.type
    this.visibility = definition.visibility
    this.details = options.details ?? null

    if (options.cause !== undefined) {
      this.cause = options.cause
    }
  }

  static throw(code: ErrorCode, options?: ApiErrorOptions): never {
    throw new ApiError(code, options)
  }
}
