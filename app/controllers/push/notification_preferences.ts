import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import NotificationPreference, {
  NOTIFICATION_EVENT_TYPES,
} from '#models/push/notification_preference'

const updateValidator = vine.compile(
  vine.object({
    preferences: vine.array(
      vine.object({
        eventType: vine.enum(NOTIFICATION_EVENT_TYPES),
        enabled: vine.boolean(),
      })
    ),
  })
)

/**
 * GET  /v1/notification-preferences — état par type d'événement
 *      (activé par défaut quand aucune ligne n'existe).
 * PUT  /v1/notification-preferences — upsert des préférences.
 */
export default class NotificationPreferences {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    const rows = await NotificationPreference.query().where('user_id', user.id)
    const overrides = new Map(rows.map((row) => [row.eventType, row.enabled]))

    const preferences = NOTIFICATION_EVENT_TYPES.map((eventType) => ({
      eventType,
      enabled: overrides.get(eventType) ?? true,
    }))

    return response.ok({ preferences })
  }

  async update({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(updateValidator)

    for (const pref of payload.preferences) {
      const existing = await NotificationPreference.query()
        .where('user_id', user.id)
        .where('event_type', pref.eventType)
        .first()

      if (existing) {
        existing.enabled = pref.enabled
        await existing.save()
      } else {
        await NotificationPreference.create({
          userId: user.id,
          eventType: pref.eventType,
          enabled: pref.enabled,
        })
      }
    }

    return response.ok({ message: 'Preferences updated' })
  }
}
