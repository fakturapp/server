import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'storage_files'

  async up() {
    this.schema.raw(
      `ALTER TABLE storage_files DROP CONSTRAINT IF EXISTS storage_files_category_check`
    )
    this.schema.raw(`
      ALTER TABLE storage_files
      ADD CONSTRAINT storage_files_category_check
      CHECK (category IN ('company_logo','invoice_logo','team_icon','payment_link_pdf','invoice_attachment','ui_background'))
    `)
  }

  async down() {
    this.schema.raw(
      `ALTER TABLE storage_files DROP CONSTRAINT IF EXISTS storage_files_category_check`
    )
    this.schema.raw(`
      ALTER TABLE storage_files
      ADD CONSTRAINT storage_files_category_check
      CHECK (category IN ('company_logo','invoice_logo','team_icon','payment_link_pdf'))
      NOT VALID
    `)
  }
}
