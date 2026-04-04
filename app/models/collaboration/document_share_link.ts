import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'
import Team from '#models/team/team'
import type { DocumentType, SharePermission } from '#models/collaboration/document_share'

export default class DocumentShareLink extends BaseModel {
  static table = 'document_share_links'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare teamId: string

  @column()
  declare documentType: DocumentType

  @column()
  declare documentId: string

  @column()
  declare token: string

  @column()
  declare permission: SharePermission

  @column()
  declare createdByUserId: string

  @column()
  declare visibility: 'team' | 'anyone'

  @column()
  declare isActive: boolean

  @column()
  declare autoExpire: boolean

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => User, { foreignKey: 'createdByUserId' })
  declare createdBy: BelongsTo<typeof User>

  get isExpired(): boolean {
    if (!this.expiresAt) return false
    return this.expiresAt < DateTime.now()
  }

  get isValid(): boolean {
    return this.isActive && !this.isExpired
  }
}
