import type { HttpContext } from '@adonisjs/core/http'
import Expense from '#models/expense/expense'
import { createExpenseValidator } from '#validators/expense_validator'
import { encryptModelFields, ENCRYPTED_FIELDS } from '#services/crypto/field_encryption_helper'

export default class Update {
  async handle(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const dek: Buffer = (ctx as any).dek
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const expense = await Expense.query().where('id', params.id).where('team_id', teamId).first()
    if (!expense) {
      return response.notFound({ message: 'Expense not found' })
    }

    const payload = await request.validateUsing(createExpenseValidator)

    const vatRate = payload.vatRate ?? 0
    const vatAmount = payload.amount * (vatRate / 100)

    const updateData: Record<string, any> = {
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

    encryptModelFields(updateData, [...ENCRYPTED_FIELDS.expense], dek)

    expense.merge(updateData)
    await expense.save()

    return response.ok({
      message: 'Expense updated',
      expense: { id: expense.id },
    })
  }
}
