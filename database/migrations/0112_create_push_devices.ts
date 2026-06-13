import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'push_devices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      // Un appareil peut changer de compte : on réassigne user_id au login.
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')

      // Token APNs, unique (clé d'upsert).
      table.string('token', 200).notNullable().unique()

      table.string('platform', 20).notNullable().defaultTo('ios')
      table.string('environment', 20).notNullable().defaultTo('production') // production | sandbox
      table.string('app_version', 50).nullable()
      table.string('locale', 10).nullable()

      table.timestamp('last_seen_at').nullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
      table.timestamp('updated_at').notNullable().defaultTo(this.now())

      table.index(['user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
