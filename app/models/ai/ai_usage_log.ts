import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class AiUsageLog extends BaseModel {
  static table = 'ai_usage_logs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare teamId: string

  @column()
  declare userId: string

  @column()
  declare model: string

  @column()
  declare endpoint: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
