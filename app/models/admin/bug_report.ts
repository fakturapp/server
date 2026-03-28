import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'

export default class BugReport extends BaseModel {
  static table = 'bug_reports'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare subject: string

  @column()
  declare description: string

  @column()
  declare stepsToReproduce: string | null

  @column()
  declare severity: 'low' | 'medium' | 'high' | 'critical'

  @column()
  declare status: 'open' | 'in_progress' | 'resolved' | 'closed'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
