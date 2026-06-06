import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, hasOne, beforeSave } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'
import TeamMember from '#models/team/team_member'
import Company from '#models/team/company'
import BankAccount from '#models/team/bank_account'
import EmailAccount from '#models/email/email_account'

export default class Team extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare iconUrl: string | null

  @column()
  declare ownerId: string

  @column()
  declare plan: 'free' | 'pro' | 'team'

  @column()
  declare stripeCustomerId: string | null

  @column()
  declare stripeSubscriptionId: string | null

  @column()
  declare subscriptionStatus: string | null

  @column()
  declare planPeriod: 'monthly' | 'annual' | null

  @column()
  declare pendingPlan: 'free' | 'pro' | 'team' | null

  @column()
  declare pendingPlanPeriod: 'monthly' | 'annual' | null

  @column.dateTime()
  declare subscriptionCurrentPeriodEnd: DateTime | null

  @column.dateTime()
  declare subscriptionGraceEndsAt: DateTime | null

  @column.dateTime()
  declare subscriptionDunningNotifiedAt: DateTime | null

  @column()
  declare subscriptionCancelAtPeriodEnd: boolean

  @column()
  declare subscriptionCancelExternal: boolean

  @column()
  declare subscriptionPaused: boolean

  @column.dateTime()
  declare subscriptionStartedAt: DateTime | null

  @column()
  declare encryptionMode: 'private' | 'standard'

  @column.dateTime()
  declare encryptionModeConfirmedAt: DateTime | null

  @column.dateTime()
  declare onboardingCompletedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'ownerId' })
  declare owner: BelongsTo<typeof User>

  @hasMany(() => TeamMember)
  declare members: HasMany<typeof TeamMember>

  @hasOne(() => Company)
  declare company: HasOne<typeof Company>

  @hasMany(() => BankAccount)
  declare bankAccounts: HasMany<typeof BankAccount>

  @hasMany(() => EmailAccount)
  declare emailAccounts: HasMany<typeof EmailAccount>

  @beforeSave()
  static async handleInvoiceCustomizationOnPlanChange(team: Team) {
    const previousPlan = team.$original.plan as string | undefined
    if (!previousPlan) return
    if (team.plan === 'free' && previousPlan !== 'free') {
      const mod = await import('#services/settings/invoice_customization_snapshot_service')
      await mod.snapshotAndResetInvoiceCustomization(team.id)
      const reminders = await import('#services/reminder/disable_reminders')
      await reminders.disableRemindersForTeam(team.id)
    } else if ((team.plan === 'pro' || team.plan === 'team') && previousPlan === 'free') {
      const mod = await import('#services/settings/invoice_customization_snapshot_service')
      await mod.restoreInvoiceCustomizationOnUpgrade(team.id)
    }
  }
}
