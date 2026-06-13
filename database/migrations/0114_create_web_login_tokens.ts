import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'web_login_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')

      // Seul le hash SHA-256 du code est stocké (le code clair n'existe que
      // dans l'URL à usage unique remise à l'app).
      table.string('code_hash', 64).notNullable().unique()
      table.string('purpose', 40).notNullable().defaultTo('web-autologin')

      // TTL très court (≈ 45 s) et usage unique.
      table.timestamp('expires_at').notNullable()
      table.timestamp('used_at').nullable()

      table.string('ip_address', 64).nullable()

      table.timestamp('created_at').notNullable().defaultTo(this.now())

      table.index(['code_hash'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
