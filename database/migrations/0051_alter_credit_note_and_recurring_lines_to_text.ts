import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // credit_note_lines was created with varchar(50)/varchar(20) instead of text
    this.schema.alterTable('credit_note_lines', (table) => {
      table.text('sale_type').alter()
      table.text('unit').alter()
    })

    // recurring_invoice_lines has the same issue
    this.schema.alterTable('recurring_invoice_lines', (table) => {
      table.text('sale_type').alter()
      table.text('unit').alter()
    })
  }

  async down() {
    this.schema.alterTable('credit_note_lines', (table) => {
      table.string('sale_type', 50).alter()
      table.string('unit', 20).alter()
    })

    this.schema.alterTable('recurring_invoice_lines', (table) => {
      table.string('sale_type', 50).alter()
      table.string('unit', 20).alter()
    })
  }
}
