import type { HttpContext } from '@adonisjs/core/http'
import CreditNote from '#models/credit_note/credit_note'

export default class Delete {
  async handle({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const creditNote = await CreditNote.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .first()

    if (!creditNote) {
      return response.notFound({ message: 'Credit note not found' })
    }

    await creditNote.delete()

    return response.ok({ message: 'Credit note deleted' })
  }
}
