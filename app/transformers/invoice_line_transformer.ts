import type InvoiceLine from '#models/invoice/invoice_line'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { num } from '#transformers/helpers/decimal'

export default class InvoiceLineTransformer extends BaseTransformer<InvoiceLine> {
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
