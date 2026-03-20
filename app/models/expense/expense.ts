import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Team from '#models/team/team'
import ExpenseCategory from '#models/expense/expense_category'

export default class Expense extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare teamId: string

  @column()
  declare categoryId: string | null

  @column()
  declare description: string

  @column()
  declare amount: number

  @column()
  declare vatAmount: number

  @column()
  declare vatRate: number

  @column()
  declare currency: string

  @column()
  declare expenseDate: string

  @column()
  declare paymentMethod: string | null

  @column()
  declare supplier: string | null

  @column()
  declare notes: string | null

  @column()
  declare receiptUrl: string | null

  @column()
  declare isDeductible: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Team)
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => ExpenseCategory, { foreignKey: 'categoryId' })
  declare category: BelongsTo<typeof ExpenseCategory>
}
