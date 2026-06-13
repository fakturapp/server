import type Invoice from '#models/invoice/invoice'
import { BaseTransformer } from '@adonisjs/core/transformers'
import ClientTransformer from '#transformers/client_transformer'
import InvoiceLineTransformer from '#transformers/invoice_line_transformer'
import { num } from '#transformers/helpers/decimal'

export default class InvoiceTransformer extends BaseTransformer<Invoice> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'invoiceNumber',
        'status',
        'subject',
        'issueDate',
        'dueDate',
        'paidDate',
        'billingType',
        'accentColor',
        'logoUrl',
        'language',
        'notes',
        'acceptanceConditions',
        'signatureField',
        'documentTitle',
        'freeField',
        'globalDiscountType',
        'paymentTerms',
        'comment',
        'deliveryAddress',
        'clientSiren',
        'clientVatNumber',
        'showQuantityColumn',
        'showUnitColumn',
        'showUnitPriceColumn',
        'showVatColumn',
        'vatExemptReason',
        'vatOnDebits',
        'sourceQuoteId',
        'paymentMethod',
        'operationCategory',
        'bankAccountId',
        'clientId',
        'clientSnapshot',
        'companySnapshot',
        'createdAt',
      ]),
      globalDiscountValue: num(this.resource.globalDiscountValue),
      subtotal: num(this.resource.subtotal),
      taxAmount: num(this.resource.taxAmount),
      total: num(this.resource.total),
      clientName: this.resource.client?.displayName || null,
      client: ClientTransformer.transform(this.whenLoaded(this.resource.client)),
      lines: InvoiceLineTransformer.transform(this.whenLoaded(this.resource.lines)),
    }
  }
}
