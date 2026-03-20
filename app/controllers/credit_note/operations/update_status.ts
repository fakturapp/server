import type { HttpContext } from '@adonisjs/core/http'
import CreditNote from '#models/credit_note/credit_note'

export default class UpdateStatus {
  async handle({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const { status } = request.only(['status'])
    const validStatuses = ['draft', 'sent', 'finalized']

    if (!validStatuses.includes(status)) {
      return response.badRequest({ message: 'Invalid status' })
    }

    const creditNote = await CreditNote.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .first()

    if (!creditNote) {
      return response.notFound({ message: 'Credit note not found' })
    }

    creditNote.status = status
    await creditNote.save()

    return response.ok({ creditNote: { id: creditNote.id, status: creditNote.status } })
  }
}
