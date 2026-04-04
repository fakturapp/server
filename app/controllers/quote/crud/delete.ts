import type { HttpContext } from '@adonisjs/core/http'
import Quote from '#models/quote/quote'
import { broadcastDocumentDeleted } from '#services/collaboration/websocket_service'

export default class Delete {
  async handle({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const quote = await Quote.query().where('id', params.id).where('team_id', teamId).first()

    if (!quote) {
      return response.notFound({ message: 'Quote not found' })
    }

    await quote.delete()
    broadcastDocumentDeleted('quote', params.id)

    return response.ok({ message: 'Quote deleted' })
  }
}
