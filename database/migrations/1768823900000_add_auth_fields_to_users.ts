import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('avatar_url', 500).nullable()

      // Email Verification
      table.boolean('email_verified').defaultTo(false)
      table.string('email_verification_token', 255).nullable()
      table.timestamp('email_verification_sent_at').nullable()

      // Two-Factor Authentication
      table.boolean('two_factor_enabled').defaultTo(false)
      table.text('two_factor_secret_encrypted').nullable()
      table.text('recovery_codes_encrypted').nullable()

      // Security
      table.string('password_reset_token', 255).nullable()
      table.timestamp('password_reset_expires_at').nullable()
      table.integer('failed_login_attempts').defaultTo(0)
      table.timestamp('locked_until').nullable()

      // Status
      table.string('status').defaultTo('active')
      table.timestamp('last_login_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('avatar_url')
      table.dropColumn('email_verified')
      table.dropColumn('email_verification_token')
      table.dropColumn('email_verification_sent_at')
      table.dropColumn('two_factor_enabled')
      table.dropColumn('two_factor_secret_encrypted')
      table.dropColumn('recovery_codes_encrypted')
      table.dropColumn('password_reset_token')
      table.dropColumn('password_reset_expires_at')
      table.dropColumn('failed_login_attempts')
      table.dropColumn('locked_until')
      table.dropColumn('status')
      table.dropColumn('last_login_at')
    })
  }
}
