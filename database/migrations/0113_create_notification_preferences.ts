import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notification_preferences'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')

      // Type d'événement (ex. 'payment.to_confirm', 'invoice.overdue').
      table.string('event_type', 60).notNullable()
      table.boolean('enabled').notNullable().defaultTo(true)

      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').notNullable().defaultTo(this.now())

      table.unique(['user_id', 'event_type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
