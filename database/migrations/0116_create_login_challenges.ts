import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'login_challenges'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')

      table.string('status', 20).notNullable().defaultTo('pending')
      table.string('match_code', 8).notNullable()
      table.boolean('require_match').notNullable().defaultTo(false)

      table.string('ip_address', 64).nullable()
      table.string('user_agent', 512).nullable()
      table.string('location', 160).nullable()

      table.boolean('consumed').notNullable().defaultTo(false)
      table.timestamp('expires_at').notNullable()
      table.timestamp('responded_at').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())

      table.index(['user_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
