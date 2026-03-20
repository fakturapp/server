import type { HttpContext } from '@adonisjs/core/http'
import RecurringInvoice from '#models/recurring_invoice/recurring_invoice'

export default class ToggleActive {
  async handle({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const recurring = await RecurringInvoice.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .first()

    if (!recurring) {
      return response.notFound({ message: 'Recurring invoice not found' })
    }

    recurring.isActive = !recurring.isActive
    await recurring.save()

    return response.ok({
      recurringInvoice: {
        id: recurring.id,
        isActive: recurring.isActive,
      },
    })
  }
}
