import type InvoicePayment from '#models/invoice/invoice_payment'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { num } from '#transformers/helpers/decimal'

export default class InvoicePaymentTransformer extends BaseTransformer<InvoicePayment> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'paymentDate', 'paymentMethod', 'notes', 'createdAt']),
      amount: num(this.resource.amount),
    }
  }
}
