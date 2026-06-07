import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

function allowedOrigins(): string[] {
  return env
    .get('CORS_ORIGIN', '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

export function resolveAppBaseUrl(request: HttpContext['request'], fallback: string): string {
  const cleanFallback = fallback.replace(/\/+$/, '')
  const origin = request.header('origin')
  if (!origin) return cleanFallback

  const normalized = origin.replace(/\/+$/, '')
  if (allowedOrigins().includes(normalized)) return normalized

  return cleanFallback
}
