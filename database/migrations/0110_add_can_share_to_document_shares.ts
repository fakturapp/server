import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'document_shares'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('can_share').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('can_share')
    })
  }
}
