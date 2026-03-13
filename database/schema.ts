/**
 * Schema file - updated to include auth fields.
 * Run "node ace migration:run" to apply migrations.
 */

import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export class AuthAccessTokenSchema extends BaseModel {
  static $columns = ['abilities', 'createdAt', 'expiresAt', 'hash', 'id', 'lastUsedAt', 'name', 'tokenableId', 'type', 'updatedAt'] as const
  $columns = AuthAccessTokenSchema.$columns
  @column()
  declare abilities: string
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime | null
  @column.dateTime()
  declare expiresAt: DateTime | null
  @column()
  declare hash: string
  @column({ isPrimary: true })
  declare id: number
  @column.dateTime()
  declare lastUsedAt: DateTime | null
  @column()
  declare name: string | null
  @column()
  declare tokenableId: number
  @column()
  declare type: string
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}

export class UserSchema extends BaseModel {
  static $columns = [
    'id', 'fullName', 'email', 'password', 'avatarUrl',
    'emailVerified', 'emailVerificationToken', 'emailVerificationSentAt',
    'twoFactorEnabled', 'twoFactorSecretEncrypted', 'recoveryCodesEncrypted',
    'passwordResetToken', 'passwordResetExpiresAt',
    'failedLoginAttempts', 'lockedUntil',
    'status', 'lastLoginAt',
    'createdAt', 'updatedAt',
  ] as const
  $columns = UserSchema.$columns

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string | null

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare avatarUrl: string | null

  // Email Verification
  @column()
  declare emailVerified: boolean

  @column({ serializeAs: null })
  declare emailVerificationToken: string | null

  @column.dateTime()
  declare emailVerificationSentAt: DateTime | null

  // 2FA
  @column()
  declare twoFactorEnabled: boolean

  @column({ serializeAs: null })
  declare twoFactorSecretEncrypted: string | null

  @column({ serializeAs: null })
  declare recoveryCodesEncrypted: string | null

  // Security
  @column({ serializeAs: null })
  declare passwordResetToken: string | null

  @column.dateTime()
  declare passwordResetExpiresAt: DateTime | null

  @column()
  declare failedLoginAttempts: number

  @column.dateTime()
  declare lockedUntil: DateTime | null

  // Status
  @column()
  declare status: 'active' | 'suspended' | 'deleted'

  @column.dateTime()
  declare lastLoginAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
