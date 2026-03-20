import type { HttpContext } from '@adonisjs/core/http'
import Expense from '#models/expense/expense'
import { decryptModelFields, ENCRYPTED_FIELDS } from '#services/crypto/field_encryption_helper'

export default class List {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const dek: Buffer = (ctx as any).dek
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const page = request.input('page', 1)
    const perPage = request.input('perPage', 50)
    const search = request.input('search', '')
    const categoryId = request.input('categoryId', '')
    const startDate = request.input('startDate', '')
    const endDate = request.input('endDate', '')

    const query = Expense.query()
      .where('team_id', teamId)
      .preload('category')
      .orderBy('expense_date', 'desc')

    if (categoryId) {
      query.where('category_id', categoryId)
    }

    if (startDate) {
      query.where('expense_date', '>=', startDate)
    }

    if (endDate) {
      query.where('expense_date', '<=', endDate)
    }

    const expenses = await query.paginate(page, perPage)

    // Decrypt fields
    for (const expense of expenses) {
      decryptModelFields(expense, [...ENCRYPTED_FIELDS.expense], dek)
    }

    // Filter by search after decryption (encrypted fields can't be searched in DB)
    let items = expenses.all()
    if (search) {
      const s = search.toLowerCase()
      items = items.filter(
        (e) =>
          e.description.toLowerCase().includes(s) ||
          e.supplier?.toLowerCase().includes(s)
      )
    }

    // Calculate totals
    const totalAmount = items.reduce((sum, e) => sum + Number(e.amount), 0)
    const totalVat = items.reduce((sum, e) => sum + Number(e.vatAmount), 0)

    return response.ok({
      expenses: items.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        vatAmount: e.vatAmount,
        vatRate: e.vatRate,
        currency: e.currency,
        expenseDate: e.expenseDate,
        paymentMethod: e.paymentMethod,
        supplier: e.supplier,
        notes: e.notes,
        receiptUrl: e.receiptUrl,
        isDeductible: e.isDeductible,
        categoryId: e.categoryId,
        categoryName: e.category?.name || null,
        categoryColor: e.category?.color || null,
        createdAt: e.createdAt.toISO(),
      })),
      meta: {
        total: expenses.total,
        perPage: expenses.perPage,
        currentPage: expenses.currentPage,
        lastPage: expenses.lastPage,
      },
      totals: {
        amount: Math.round(totalAmount * 100) / 100,
        vat: Math.round(totalVat * 100) / 100,
        ttc: Math.round((totalAmount + totalVat) * 100) / 100,
      },
    })
  }
}
