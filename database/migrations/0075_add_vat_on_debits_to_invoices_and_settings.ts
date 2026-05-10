import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('invoices', (table) => {
      table.boolean('vat_on_debits').notNullable().defaultTo(false)
    })

    this.schema.alterTable('invoice_settings', (table) => {
      table.boolean('default_vat_on_debits').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable('invoices', (table) => {
      table.dropColumn('vat_on_debits')
    })

    this.schema.alterTable('invoice_settings', (table) => {
      table.dropColumn('default_vat_on_debits')
    })
  }
}
