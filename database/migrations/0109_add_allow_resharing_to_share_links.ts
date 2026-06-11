import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'document_share_links'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('allow_resharing').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('allow_resharing')
    })
  }
}
