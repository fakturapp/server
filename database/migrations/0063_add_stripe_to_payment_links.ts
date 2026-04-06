import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payment_links'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('stripe_payment_intent_id', 255).nullable()
      table.string('stripe_status', 30).nullable()
      table.text('encrypted_stripe_publishable_key').nullable()
      table.text('encrypted_stripe_secret_key').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('stripe_payment_intent_id')
      table.dropColumn('stripe_status')
      table.dropColumn('encrypted_stripe_publishable_key')
      table.dropColumn('encrypted_stripe_secret_key')
    })
  }
}
