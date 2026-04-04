import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'document_share_links'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // 'team' = only team members can use the link
      // 'anyone' = anyone with a valid account can use the link
      table
        .enum('visibility', ['team', 'anyone'], {
          useNative: true,
          enumName: 'share_link_visibility',
          existingType: false,
        })
        .notNullable()
        .defaultTo('team')

      // Auto-expire: link deactivates when creator disconnects from WebSocket
      table.boolean('auto_expire').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('visibility')
      table.dropColumn('auto_expire')
    })
    this.schema.raw('DROP TYPE IF EXISTS share_link_visibility')
  }
}
