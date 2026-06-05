import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.string('two_factor_email_code_hash', 255).nullable()
      table.timestamp('two_factor_email_code_expires_at').nullable()
    })

    this.schema.createTable('trusted_devices', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
      table.string('token_hash', 255).notNullable()
      table.string('device_label', 255).nullable()
      table.string('ip_address', 45).nullable()
      table.text('user_agent').nullable()
      table.timestamp('last_used_at').nullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').notNullable()

      table.index(['user_id'], 'idx_trusted_devices_user_id')
      table.index(['token_hash'], 'idx_trusted_devices_token_hash')
    })
  }

  async down() {
    this.schema.dropTable('trusted_devices')

    this.schema.alterTable('users', (table) => {
      table.dropColumn('two_factor_email_code_hash')
      table.dropColumn('two_factor_email_code_expires_at')
    })
  }
}
