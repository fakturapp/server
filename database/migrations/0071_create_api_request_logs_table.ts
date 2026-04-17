import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'api_request_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('request_id', 128).notNullable()
      table.string('method', 10).notNullable()
      table.string('path', 500).notNullable()
      table.integer('status_code').notNullable()
      table.timestamp('requested_at').notNullable()

      table.index(['user_id'], 'idx_api_request_logs_user_id')
      table.index(['requested_at'], 'idx_api_request_logs_requested_at')
      table.index(['request_id'], 'idx_api_request_logs_request_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
