import type RecurringInvoice from '#models/recurring_invoice/recurring_invoice'
import { BaseTransformer } from '@adonisjs/core/transformers'
import ClientTransformer from '#transformers/client_transformer'
import RecurringInvoiceLineTransformer from '#transformers/recurring_invoice_line_transformer'

export default class RecurringInvoiceTransformer extends BaseTransformer<RecurringInvoice> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'name',
        'frequency',
        'customIntervalDays',
        'startDate',
        'nextExecutionDate',
        'endDate',
        'isActive',
        'lastGeneratedAt',
        'generationCount',
        'dueDays',
        'subject',
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
        'globalDiscountValue',
        'deliveryAddress',
        'clientSiren',
        'clientVatNumber',
        'paymentTerms',
        'paymentMethod',
        'bankAccountId',
        'vatExemptReason',
        'operationCategory',
        'clientId',
        'createdAt',
      ]),
      clientName: this.resource.client?.displayName || null,
      client: ClientTransformer.transform(this.whenLoaded(this.resource.client)),
      lines: RecurringInvoiceLineTransformer.transform(this.whenLoaded(this.resource.lines)),
    }
  }
}
