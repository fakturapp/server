import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Team from '#models/team/team'
import Invoice from '#models/invoice/invoice'

export default class InvoicePayment extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare invoiceId: string

  @column()
  declare teamId: string

  @column()
  declare amount: number

  @column()
  declare paymentDate: string

  @column()
  declare paymentMethod: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>
}
