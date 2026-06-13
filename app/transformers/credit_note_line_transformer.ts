import type CreditNoteLine from '#models/credit_note/credit_note_line'
import { BaseTransformer } from '@adonisjs/core/transformers'
import { num } from '#transformers/helpers/decimal'

export default class CreditNoteLineTransformer extends BaseTransformer<CreditNoteLine> {
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
