import type InvoiceLine from '#models/invoice/invoice_line'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class InvoiceLineTransformer extends BaseTransformer<InvoiceLine> {
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
