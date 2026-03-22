import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Team-level reminder configuration
    this.schema.createTable('payment_reminder_settings', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table
        .uuid('team_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('teams')
        .onDelete('CASCADE')

      table.boolean('enabled').notNullable().defaultTo(false)

      // Reminder schedule: days before/after due date
      table.integer('days_before_due').nullable() // e.g. 3 = reminder 3 days before
      table.integer('days_after_due').nullable() // e.g. 7 = reminder 7 days after
      table.integer('repeat_interval_days').nullable() // e.g. 7 = repeat every 7 days after first overdue reminder

      // Email template
      table.text('email_subject_template').nullable()
      table.text('email_body_template').nullable()

      // Auto-send or manual only
      table.boolean('auto_send').notNullable().defaultTo(false)

      // Default email account to use
      table
        .uuid('email_account_id')
        .nullable()
        .references('id')
        .inTable('email_accounts')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    // Track individual reminders sent
    this.schema.createTable('payment_reminders', (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.uuid('team_id').notNullable().references('id').inTable('teams').onDelete('CASCADE')

      table
        .uuid('invoice_id')
        .notNullable()
        .references('id')
        .inTable('invoices')
        .onDelete('CASCADE')

      table.string('type', 20).notNullable() // 'before_due' | 'after_due' | 'manual'
      table.string('status', 20).notNullable().defaultTo('sent') // 'sent' | 'error'
      table.string('to_email', 255).nullable()
      table.text('error_message').nullable()

      table.timestamp('sent_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['team_id'])
      table.index(['invoice_id'])
      table.index(['team_id', 'invoice_id'])
    })
  }

  async down() {
    this.schema.dropTable('payment_reminders')
    this.schema.dropTable('payment_reminder_settings')
  }
}
