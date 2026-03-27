import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.boolean('has_recovery_key').notNullable().defaultTo(false)
      table.text('recovery_key_hash').nullable()
    })

    this.schema.alterTable('team_members', (table) => {
      table.text('encrypted_team_dek_recovery').nullable()
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('has_recovery_key')
      table.dropColumn('recovery_key_hash')
    })

    this.schema.alterTable('team_members', (table) => {
      table.dropColumn('encrypted_team_dek_recovery')
    })
  }
}
