import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('push_devices', (table) => {
      table.boolean('is_synthetic').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable('push_devices', (table) => {
      table.dropColumn('is_synthetic')
    })
  }
}
