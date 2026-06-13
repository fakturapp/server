import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'

/**
 * Code à usage unique pour ouvrir le site web déjà authentifié
 * (« Gérer mon compte » depuis l'app mobile). Pattern Stripe Express /
 * Shopify Multipass : TTL court, single-use, lié à l'utilisateur.
 */
export default class WebLoginToken extends BaseModel {
  public static table = 'web_login_tokens'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column({ serializeAs: null })
  declare codeHash: string

  @column()
  declare purpose: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare usedAt: DateTime | null

  @column()
  declare ipAddress: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isRedeemable(): boolean {
    return this.usedAt === null && this.expiresAt > DateTime.now()
  }
}
