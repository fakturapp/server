import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('teams', (table) => {
      table.string('encryption_mode', 16).notNullable().defaultTo('private')
      table.timestamp('encryption_mode_confirmed_at').nullable()
    })

    this.schema.raw(`
      ALTER TABLE teams
      ADD CONSTRAINT teams_encryption_mode_check
      CHECK (encryption_mode IN ('private', 'standard'))
    `)
  }

  async down() {
    this.schema.raw(`ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_encryption_mode_check`)
    this.schema.alterTable('teams', (table) => {
      table.dropColumn('encryption_mode')
      table.dropColumn('encryption_mode_confirmed_at')
    })
  }
}
