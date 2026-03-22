import type InvoicePayment from '#models/invoice/invoice_payment'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class InvoicePaymentTransformer extends BaseTransformer<InvoicePayment> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'amount',
      'paymentDate',
      'paymentMethod',
      'notes',
      'createdAt',
    ])
  }
}
