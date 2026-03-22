import type CreditNoteLine from '#models/credit_note/credit_note_line'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class CreditNoteLineTransformer extends BaseTransformer<CreditNoteLine> {
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
