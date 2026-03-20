import type { HttpContext } from '@adonisjs/core/http'
import ExpenseCategory from '#models/expense/expense_category'
import { createExpenseCategoryValidator } from '#validators/expense_validator'

export default class Create {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const payload = await request.validateUsing(createExpenseCategoryValidator)

    const category = await ExpenseCategory.create({
      teamId,
      name: payload.name,
      color: payload.color || null,
    })

    return response.created({
      message: 'Category created',
      category: { id: category.id, name: category.name, color: category.color },
    })
  }
}
