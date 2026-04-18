import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoice_settings'

  async up() {
    this.schema.raw(
      `alter table ${this.tableName}
         add column if not exists default_vat_rate real not null default 20,
         add column if not exists default_show_quantity_column boolean not null default true,
         add column if not exists default_show_unit_column boolean not null default true,
         add column if not exists default_show_unit_price_column boolean not null default true,
         add column if not exists default_show_vat_column boolean not null default true`
    )
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('default_vat_rate')
      table.dropColumn('default_show_quantity_column')
      table.dropColumn('default_show_unit_column')
      table.dropColumn('default_show_unit_price_column')
      table.dropColumn('default_show_vat_column')
    })
  }
}
