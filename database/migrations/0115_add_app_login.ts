import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.boolean('app_login_enabled').notNullable().defaultTo(false)
      table.boolean('app_login_require_match').notNullable().defaultTo(false)
    })
    this.schema.alterTable('push_devices', (table) => {
      table.boolean('app_login_enabled').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('app_login_enabled')
      table.dropColumn('app_login_require_match')
    })
    this.schema.alterTable('push_devices', (table) => {
      table.dropColumn('app_login_enabled')
    })
  }
}
