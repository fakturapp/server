import type { HttpContext } from '@adonisjs/core/http'
import ExpenseCategory from '#models/expense/expense_category'

export default class Delete {
  async handle({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const category = await ExpenseCategory.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .first()

    if (!category) {
      return response.notFound({ message: 'Category not found' })
    }

    await category.delete()

    return response.ok({ message: 'Category deleted' })
  }
}
