import type RecurringInvoiceLine from '#models/recurring_invoice/recurring_invoice_line'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { num } from '#transformers/helpers/decimal'

export default class RecurringInvoiceLineTransformer extends BaseTransformer<RecurringInvoiceLine> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'position', 'description', 'saleType', 'unit']),
      quantity: num(this.resource.quantity),
      unitPrice: num(this.resource.unitPrice),
      vatRate: num(this.resource.vatRate),
      total: num(this.resource.total),
    }
  }
}
