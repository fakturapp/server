import type { HttpContext } from '@adonisjs/core/http'
import ExpenseCategory from '#models/expense/expense_category'

export default class List {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const categories = await ExpenseCategory.query().where('team_id', teamId).orderBy('name', 'asc')

    return response.ok({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      })),
    })
  }
}
