import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'

export default class ApiRequestLog extends BaseModel {
  static table = 'api_request_logs'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string | null

  @column()
  declare requestId: string

  @column()
  declare method: string

  @column()
  declare path: string

  @column()
  declare statusCode: number

  @column.dateTime()
  declare requestedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
