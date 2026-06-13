import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class NotificationPreference extends BaseModel {
  public static table = 'notification_preferences'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare eventType: string

  @column()
  declare enabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

export const NOTIFICATION_EVENT_TYPES = [
  'payment.received',
  'payment.to_confirm',
  'payment.confirmed',
  'invoice.overdue',
  'quote.accepted',
  'quote.refused',
  'team.activity',
  'security.alert',
] as const

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number]
