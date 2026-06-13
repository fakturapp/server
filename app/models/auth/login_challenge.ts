import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'

export default class LoginChallenge extends BaseModel {
  public static table = 'login_challenges'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare status: 'pending' | 'approved' | 'denied' | 'expired'

  @column()
  declare purpose: 'login' | 'account_verify'

  @column.dateTime()
  declare verifiedAt: DateTime | null

  @column({ serializeAs: null })
  declare matchCode: string

  @column()
  declare requireMatch: boolean

  @column()
  declare ipAddress: string | null

  @column()
  declare userAgent: string | null

  @column()
  declare location: string | null

  @column()
  declare consumed: boolean

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare respondedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isPending(): boolean {
    return this.status === 'pending' && this.expiresAt > DateTime.now()
  }
}
