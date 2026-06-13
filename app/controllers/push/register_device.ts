import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import PushDevice from '#models/push/push_device'

const ENVIRONMENTS = ['production', 'sandbox'] as const

const registerValidator = vine.compile(
  vine.object({
    token: vine.string().trim().minLength(8).maxLength(200),
    platform: vine.string().trim().optional(),
    environment: vine.enum(ENVIRONMENTS).optional(),
    appVersion: vine.string().trim().maxLength(50).optional(),
    locale: vine.string().trim().maxLength(10).optional(),
  })
)

export default class RegisterDevice {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(registerValidator)

    const isSynthetic = payload.token.startsWith('faktur-synthetic-')

    const existing = await PushDevice.findBy('token', payload.token)
    if (existing) {
      existing.userId = user.id
      existing.platform = payload.platform ?? existing.platform
      existing.environment = payload.environment ?? existing.environment
      existing.appVersion = payload.appVersion ?? existing.appVersion
      existing.locale = payload.locale ?? existing.locale
      existing.isSynthetic = isSynthetic
      existing.lastSeenAt = DateTime.now()
      await existing.save()
      return response.ok({ message: 'Device updated' })
    }

    await PushDevice.create({
      userId: user.id,
      token: payload.token,
      platform: payload.platform ?? 'ios',
      environment: payload.environment ?? 'production',
      appVersion: payload.appVersion ?? null,
      locale: payload.locale ?? null,
      isSynthetic,
      lastSeenAt: DateTime.now(),
    })

    return response.created({ message: 'Device registered' })
  }
}
