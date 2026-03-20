import type { HttpContext } from '@adonisjs/core/http'
import Expense from '#models/expense/expense'

export default class Delete {
  async handle({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const expense = await Expense.query().where('id', params.id).where('team_id', teamId).first()
    if (!expense) {
      return response.notFound({ message: 'Expense not found' })
    }

    await expense.delete()

    return response.ok({ message: 'Expense deleted' })
  }
}
