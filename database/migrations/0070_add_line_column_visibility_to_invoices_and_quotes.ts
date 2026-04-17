import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected invoicesTableName = 'invoices'
  protected quotesTableName = 'quotes'

  async up() {
    this.schema.alterTable(this.invoicesTableName, (table) => {
      table.boolean('show_quantity_column').notNullable().defaultTo(true)
      table.boolean('show_unit_column').notNullable().defaultTo(true)
      table.boolean('show_unit_price_column').notNullable().defaultTo(true)
      table.boolean('show_vat_column').notNullable().defaultTo(true)
    })

    this.schema.alterTable(this.quotesTableName, (table) => {
      table.boolean('show_quantity_column').notNullable().defaultTo(true)
      table.boolean('show_unit_column').notNullable().defaultTo(true)
      table.boolean('show_unit_price_column').notNullable().defaultTo(true)
      table.boolean('show_vat_column').notNullable().defaultTo(true)
    })
  }

  async down() {
    this.schema.alterTable(this.invoicesTableName, (table) => {
      table.dropColumn('show_quantity_column')
      table.dropColumn('show_unit_column')
      table.dropColumn('show_unit_price_column')
      table.dropColumn('show_vat_column')
    })

    this.schema.alterTable(this.quotesTableName, (table) => {
      table.dropColumn('show_quantity_column')
      table.dropColumn('show_unit_column')
      table.dropColumn('show_unit_price_column')
      table.dropColumn('show_vat_column')
    })
  }
}
