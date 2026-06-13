import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'login_challenges'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('purpose', 20).notNullable().defaultTo('login')
      table.timestamp('verified_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('purpose')
      table.dropColumn('verified_at')
    })
  }
}
