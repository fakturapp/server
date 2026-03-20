import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoice_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('ai_enabled').notNullable().defaultTo(false)
      table.string('ai_model', 100).notNullable().defaultTo('claude-sonnet-4-5-20250929')
      table.text('ai_custom_api_key').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('ai_enabled')
      table.dropColumn('ai_model')
      table.dropColumn('ai_custom_api_key')
    })
  }
}
