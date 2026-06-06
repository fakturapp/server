import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('invoice_customization_snapshots', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE')
      table.text('snapshot').notNullable()
      table.timestamp('created_at').notNullable()

      table.index(['team_id'], 'idx_invoice_customization_snapshots_team_id')
    })
  }

  async down() {
    this.schema.dropTable('invoice_customization_snapshots')
  }
}
