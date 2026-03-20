import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import CreditNote from '#models/credit_note/credit_note'

export default class CreditNoteLine extends BaseModel {
  static table = 'credit_note_lines'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare creditNoteId: string

  @column()
  declare position: number

  @column()
  declare description: string

  @column()
  declare saleType: string | null

  @column()
  declare quantity: number

  @column()
  declare unit: string | null

  @column()
  declare unitPrice: number

  @column()
  declare vatRate: number

  @column()
  declare total: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => CreditNote)
  declare creditNote: BelongsTo<typeof CreditNote>
}
