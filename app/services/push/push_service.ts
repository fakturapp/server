import PushDevice from '#models/push/push_device'
import NotificationPreference from '#models/push/notification_preference'
import type { NotificationEventType } from '#models/push/notification_preference'
import apnsClient, { type ApnsPayload } from '#services/push/apns_client'
import logger from '@adonisjs/core/services/logger'

export interface PushNotificationInput {
  title: string
  body: string
  subtitle?: string

  category?: string

  threadId?: string
  interruptionLevel?: 'passive' | 'active' | 'time-sensitive'
  relevanceScore?: number

  data?: Record<string, string | number | boolean>
}

class PushService {

  async notifyUser(
    userId: string,
    eventType: NotificationEventType,
    input: PushNotificationInput
  ): Promise<void> {
    try {
      if (!apnsClient.isConfigured) {
        logger.error(
          { userId, eventType },
          'APNs non configuré (APNS_KEY/APNS_KEY_ID/APNS_TEAM_ID/APNS_BUNDLE_ID) — notification ignorée'
        )
        return
      }

      const enabled = await this.isEnabled(userId, eventType)
      if (!enabled) return

      const devices = await PushDevice.query().where('user_id', userId)
      if (devices.length === 0) return

      const payload = this.buildPayload(input)

      await Promise.all(
        devices.map(async (device) => {
          const result = await apnsClient.send(device.token, payload)
          if (!result.ok && this.isDeadToken(result.reason, result.status)) {
            await device.delete().catch(() => {})
          }
        })
      )
    } catch (error) {
      logger.warn({ err: error, userId, eventType }, 'push notification failed')
    }
  }

  private async isEnabled(userId: string, eventType: NotificationEventType): Promise<boolean> {
    const pref = await NotificationPreference.query()
      .where('user_id', userId)
      .where('event_type', eventType)
      .first()
    return pref ? pref.enabled : true
  }

  private buildPayload(input: PushNotificationInput): ApnsPayload {
    const payload: ApnsPayload = {
      aps: {
        alert: {
          title: input.title,
          subtitle: input.subtitle,
          body: input.body,
        },
        sound: 'default',
      },
    }
    if (input.category) payload.aps.category = input.category
    if (input.threadId) payload.aps['thread-id'] = input.threadId
    if (input.interruptionLevel) payload.aps['interruption-level'] = input.interruptionLevel
    if (typeof input.relevanceScore === 'number') {
      payload.aps['relevance-score'] = input.relevanceScore
    }
    if (input.data) {
      for (const [key, value] of Object.entries(input.data)) {
        payload[key] = value
      }
    }
    return payload
  }

  private isDeadToken(reason: string | undefined, status: number): boolean {
    return status === 410 || reason === 'Unregistered' || reason === 'BadDeviceToken'
  }
}

const pushService = new PushService()
export default pushService
