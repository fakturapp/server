import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payment_links'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('team_id')
        .notNullable()
        .references('id')
        .inTable('teams')
        .onDelete('CASCADE')
      table
        .uuid('invoice_id')
        .notNullable()
        .references('id')
        .inTable('invoices')
        .onDelete('CASCADE')
      table
        .uuid('created_by_user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      // Token (SHA-256 hash stored, raw token only in URL)
      table.string('token_hash', 64).notNullable().unique()

      // Payment configuration
      table.string('payment_method', 50).notNullable()
      table.string('payment_type', 20).notNullable().defaultTo('full')
      table.boolean('show_iban').notNullable().defaultTo(true)

      // Password protection (hash encrypted with app-level EncryptionService)
      table.text('password_hash').nullable()

      // Expiration
      table.string('expiration_type', 20).nullable()
      table.timestamp('expires_at').nullable()

      // Link status
      table.boolean('is_active').notNullable().defaultTo(true)

      // IBAN snapshot (encrypted with app-level EncryptionService, NOT DEK)
      table.text('encrypted_iban').nullable()
      table.text('encrypted_bic').nullable()
      table.text('encrypted_bank_name').nullable()

      // Client info (encrypted with DEK via encryptModelFields)
      table.text('client_email').nullable()
      table.text('client_name').nullable()

      // Invoice snapshot for public display
      table.decimal('amount', 12, 2).notNullable()
      table.string('currency', 3).notNullable().defaultTo('EUR')
      table.string('invoice_number', 50).notNullable()
      table.text('company_name').nullable()

      // PDF snapshot (stored at link creation for public access without DEK)
      table.text('pdf_storage_key').nullable()
      table.binary('pdf_data').nullable()

      // Payment tracking
      table.timestamp('paid_at').nullable()
      table.timestamp('confirmed_at').nullable()
      table
        .uuid('confirmed_by_user_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.text('confirmation_date').nullable()
      table.text('confirmation_notes').nullable()

      // Timestamps
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      // Indexes
      table.index(['team_id'], 'idx_payment_links_team_id')
      table.unique(['invoice_id'], 'uq_payment_links_invoice_id')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
