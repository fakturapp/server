import type CreditNote from '#models/credit_note/credit_note'
import { BaseTransformer } from '@adonisjs/core/transformers'
import ClientTransformer from '#transformers/client_transformer'
import CreditNoteLineTransformer from '#transformers/credit_note_line_transformer'

export default class CreditNoteTransformer extends BaseTransformer<CreditNote> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'creditNoteNumber',
        'status',
        'reason',
        'subject',
        'issueDate',
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
        'subtotal',
        'taxAmount',
        'total',
        'sourceInvoiceId',
        'comment',
        'vatExemptReason',
        'operationCategory',
        'clientId',
        'createdAt',
      ]),
      clientName: this.resource.client?.displayName || null,
      client: ClientTransformer.transform(this.whenLoaded(this.resource.client)),
      lines: CreditNoteLineTransformer.transform(this.whenLoaded(this.resource.lines)),
    }
  }
}
