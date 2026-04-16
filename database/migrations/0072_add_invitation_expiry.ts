import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('team_members', (table) => {
      table.timestamp('invitation_expires_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('team_members', (table) => {
      table.dropColumn('invitation_expires_at')
    })
  }
}
