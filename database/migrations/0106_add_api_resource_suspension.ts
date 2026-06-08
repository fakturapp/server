import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('teams', (table) => {
      table.timestamp('api_grace_ends_at').nullable()
    })
    this.schema.alterTable('api_keys', (table) => {
      table.timestamp('suspended_at').nullable()
    })
    this.schema.alterTable('api_projects', (table) => {
      table.timestamp('suspended_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('teams', (table) => {
      table.dropColumn('api_grace_ends_at')
    })
    this.schema.alterTable('api_keys', (table) => {
      table.dropColumn('suspended_at')
    })
    this.schema.alterTable('api_projects', (table) => {
      table.dropColumn('suspended_at')
    })
  }
}
