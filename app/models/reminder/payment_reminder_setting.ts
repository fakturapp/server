import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Team from '#models/team/team'
import EmailAccount from '#models/email/email_account'

export default class PaymentReminderSetting extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare teamId: string

  @column()
  declare enabled: boolean

  @column()
  declare daysBeforeDue: number | null

  @column()
  declare daysAfterDue: number | null

  @column()
  declare repeatIntervalDays: number | null

  @column()
  declare emailSubjectTemplate: string | null

  @column()
  declare emailBodyTemplate: string | null

  @column()
  declare autoSend: boolean

  @column()
  declare emailAccountId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => EmailAccount)
  declare emailAccount: BelongsTo<typeof EmailAccount>
}
