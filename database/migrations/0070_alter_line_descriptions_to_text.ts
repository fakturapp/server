import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('invoice_lines', (table) => {
      table.text('description').notNullable().alter()
    })

    this.schema.alterTable('quote_lines', (table) => {
      table.text('description').notNullable().alter()
    })

    this.schema.alterTable('credit_note_lines', (table) => {
      table.text('description').notNullable().alter()
    })

    this.schema.alterTable('recurring_invoice_lines', (table) => {
      table.text('description').notNullable().alter()
    })
  }

  async down() {
    this.schema.alterTable('invoice_lines', (table) => {
      table.string('description', 255).notNullable().alter()
    })

    this.schema.alterTable('quote_lines', (table) => {
      table.string('description', 255).notNullable().alter()
    })

    this.schema.alterTable('credit_note_lines', (table) => {
      table.string('description', 255).notNullable().alter()
    })

    this.schema.alterTable('recurring_invoice_lines', (table) => {
      table.string('description', 255).notNullable().alter()
    })
  }
}
