import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoice_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('footer_mode', 30).defaultTo('company_info').alter()
    })

    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .where('footer_mode', 'vat_exempt')
        .update({ footer_mode: 'company_info' })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('footer_mode', 30).defaultTo('vat_exempt').alter()
    })
  }
}
