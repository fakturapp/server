import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'

export default class PushDevice extends BaseModel {
  public static table = 'push_devices'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare token: string

  @column()
  declare platform: string

  @column()
  declare environment: string

  @column()
  declare appVersion: string | null

  @column()
  declare locale: string | null

  @column()
  declare appLoginEnabled: boolean

  @column()
  declare isSynthetic: boolean

  @column.dateTime()
  declare lastSeenAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
