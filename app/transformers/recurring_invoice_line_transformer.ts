import type RecurringInvoiceLine from '#models/recurring_invoice/recurring_invoice_line'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class RecurringInvoiceLineTransformer extends BaseTransformer<RecurringInvoiceLine> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'position',
      'description',
      'saleType',
      'quantity',
      'unit',
      'unitPrice',
      'vatRate',
      'total',
    ])
  }
}
