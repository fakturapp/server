import type RecurringInvoice from '#models/recurring_invoice/recurring_invoice'
import { BaseTransformer } from '@adonisjs/core/transformers'
import ClientTransformer from '#transformers/client_transformer'
import RecurringInvoiceLineTransformer from '#transformers/recurring_invoice_line_transformer'
import { num } from '#transformers/helpers/decimal'

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
      globalDiscountValue: num(this.resource.globalDiscountValue),
      total: Array.isArray(this.resource.lines)
        ? this.resource.lines.reduce((sum, line) => sum + (num(line.total) ?? 0), 0)
        : null,
      clientName: this.resource.client?.displayName || null,
      client: ClientTransformer.transform(this.whenLoaded(this.resource.client)),
      lines: RecurringInvoiceLineTransformer.transform(this.whenLoaded(this.resource.lines)),
    }
  }
}
