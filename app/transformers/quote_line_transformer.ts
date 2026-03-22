import type QuoteLine from '#models/quote/quote_line'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class QuoteLineTransformer extends BaseTransformer<QuoteLine> {
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
