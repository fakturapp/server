import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('teams', (table) => {
      table.timestamp('onboarding_completed_at').nullable()
    })

    this.defer(async (db) => {
      await db.rawQuery('UPDATE teams SET onboarding_completed_at = created_at')
    })
  }

  async down() {
    this.schema.alterTable('teams', (table) => {
      table.dropColumn('onboarding_completed_at')
    })
  }
}
