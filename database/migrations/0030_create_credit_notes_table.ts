import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('credit_notes', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('team_id')
        .notNullable()
        .references('id')
        .inTable('teams')
        .onDelete('CASCADE')
      table
        .uuid('client_id')
        .nullable()
        .references('id')
        .inTable('clients')
        .onDelete('SET NULL')
      table
        .uuid('source_invoice_id')
        .nullable()
        .references('id')
        .inTable('invoices')
        .onDelete('SET NULL')
      table.string('credit_note_number', 50).notNullable()
      table.string('status', 20).notNullable().defaultTo('draft')
      table.text('reason').nullable()
      table.text('subject').nullable()
      table.string('issue_date').notNullable()
      table.string('billing_type', 20).notNullable().defaultTo('detailed')
      table.string('accent_color', 7).notNullable().defaultTo('#6366f1')
      table.text('logo_url').nullable()
      table.string('language', 5).notNullable().defaultTo('fr')
      table.text('notes').nullable()
      table.text('acceptance_conditions').nullable()
      table.boolean('signature_field').notNullable().defaultTo(false)
      table.text('document_title').nullable()
      table.text('free_field').nullable()
      table.string('global_discount_type', 20).notNullable().defaultTo('none')
      table.decimal('global_discount_value', 12, 2).notNullable().defaultTo(0)
      table.text('delivery_address').nullable()
      table.text('client_siren').nullable()
      table.text('client_vat_number').nullable()
      table.decimal('subtotal', 12, 2).notNullable().defaultTo(0)
      table.decimal('tax_amount', 12, 2).notNullable().defaultTo(0)
      table.decimal('total', 12, 2).notNullable().defaultTo(0)
      table.text('comment').nullable()
      table.string('vat_exempt_reason', 30).notNullable().defaultTo('none')
      table.string('operation_category', 20).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['team_id', 'credit_note_number'])
      table.index(['team_id'])
      table.index(['source_invoice_id'])
    })

    this.schema.createTable('credit_note_lines', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('credit_note_id')
        .notNullable()
        .references('id')
        .inTable('credit_notes')
        .onDelete('CASCADE')
      table.integer('position').notNullable().defaultTo(0)
      table.text('description').notNullable()
      table.string('sale_type', 50).nullable()
      table.decimal('quantity', 12, 2).notNullable().defaultTo(1)
      table.string('unit', 20).nullable()
      table.decimal('unit_price', 12, 2).notNullable().defaultTo(0)
      table.decimal('vat_rate', 5, 2).notNullable().defaultTo(0)
      table.decimal('total', 12, 2).notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['credit_note_id'])
    })
  }

  async down() {
    this.schema.dropTableIfExists('credit_note_lines')
    this.schema.dropTableIfExists('credit_notes')
  }
}
