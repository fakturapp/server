import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'storage_files'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('reference_id').nullable()
      table.index(['team_id', 'category', 'reference_id'], 'storage_files_team_category_ref_idx')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(
        ['team_id', 'category', 'reference_id'],
        'storage_files_team_category_ref_idx'
      )
      table.dropColumn('reference_id')
    })
  }
}
