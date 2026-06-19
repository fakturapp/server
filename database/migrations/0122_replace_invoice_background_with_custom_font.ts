import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoice_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('custom_background_url')
      table.string('custom_font_url', 1024).nullable()
      table.string('custom_font_name', 120).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('custom_font_url')
      table.dropColumn('custom_font_name')
      table.string('custom_background_url', 1024).nullable()
    })
  }
}
