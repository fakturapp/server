import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'invoice_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('stripe_publishable_key').nullable()
      table.text('stripe_secret_key').nullable()
      table.text('stripe_webhook_secret').nullable()
      table.text('stripe_webhook_secret_app').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('stripe_publishable_key')
      table.dropColumn('stripe_secret_key')
      table.dropColumn('stripe_webhook_secret')
      table.dropColumn('stripe_webhook_secret_app')
    })
  }
}
