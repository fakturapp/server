import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'
import Team from '#models/team/team'

export type DocumentType = 'invoice' | 'quote' | 'credit_note'
export type SharePermission = 'viewer' | 'editor'
export type ShareStatus = 'active' | 'pending' | 'revoked'

export default class DocumentShare extends BaseModel {
  static table = 'document_shares'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare teamId: string

  @column()
  declare documentType: DocumentType

  @column()
  declare documentId: string

  @column()
  declare sharedByUserId: string

  @column()
  declare sharedWithUserId: string | null

  @column()
  declare sharedWithEmail: string | null

  @column()
  declare permission: SharePermission

  @column()
  declare status: ShareStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => User, { foreignKey: 'sharedByUserId' })
  declare sharedBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'sharedWithUserId' })
  declare sharedWith: BelongsTo<typeof User>
}
