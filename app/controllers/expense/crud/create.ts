import type { HttpContext } from '@adonisjs/core/http'
import Expense from '#models/expense/expense'
import { createExpenseValidator } from '#validators/expense_validator'
import { encryptModelFields, ENCRYPTED_FIELDS } from '#services/crypto/field_encryption_helper'

export default class Create {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const dek: Buffer = (ctx as any).dek
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const payload = await request.validateUsing(createExpenseValidator)

    const vatRate = payload.vatRate ?? 0
    const vatAmount = payload.amount * (vatRate / 100)

    const expenseData: Record<string, any> = {
      teamId,
      categoryId: payload.categoryId || null,
      description: payload.description,
      amount: Math.round(payload.amount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      vatRate,
      currency: payload.currency || 'EUR',
      expenseDate: payload.expenseDate,
      paymentMethod: payload.paymentMethod || null,
      supplier: payload.supplier || null,
      notes: payload.notes || null,
      receiptUrl: payload.receiptUrl || null,
      isDeductible: payload.isDeductible ?? true,
    }

    encryptModelFields(expenseData, [...ENCRYPTED_FIELDS.expense], dek)

    const expense = await Expense.create(expenseData)

    return response.created({
      message: 'Expense created',
      expense: { id: expense.id },
    })
  }
}
