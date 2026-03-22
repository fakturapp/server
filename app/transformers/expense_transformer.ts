import type Expense from '#models/expense/expense'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class ExpenseTransformer extends BaseTransformer<Expense> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'description',
        'amount',
        'vatAmount',
        'vatRate',
        'currency',
        'expenseDate',
        'paymentMethod',
        'supplier',
        'notes',
        'receiptUrl',
        'isDeductible',
        'categoryId',
        'createdAt',
      ]),
      categoryName: this.resource.category?.name || null,
      categoryColor: this.resource.category?.color || null,
    }
  }
}
