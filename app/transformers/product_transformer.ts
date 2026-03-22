import type Product from '#models/product/product'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class ProductTransformer extends BaseTransformer<Product> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'description',
      'unitPrice',
      'vatRate',
      'unit',
      'saleType',
      'reference',
      'isArchived',
      'createdAt',
    ])
  }
}
