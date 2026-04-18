import type { HttpContext } from '@adonisjs/core/http'
import CreditNote from '#models/credit_note/credit_note'
import documentNumberingService from '#services/documents/document_numbering_service'

export default class NextNumber {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const currentYear = new Date().getFullYear().toString()
    const fallbackPattern = 'AV-{annee}-{numero}'
    const prefix = documentNumberingService.buildSequencePrefix(
      fallbackPattern,
      fallbackPattern,
      currentYear
    )

    const lastCreditNote = await CreditNote.query()
      .where('team_id', teamId)
      .where('credit_note_number', 'like', `${prefix}%`)
      .orderBy('created_at', 'desc')
      .first()

    const nextNumber = documentNumberingService.buildNextSequentialNumber({
      pattern: fallbackPattern,
      fallbackPattern,
      currentYear,
      lastNumber: lastCreditNote?.creditNoteNumber,
    })

    return response.ok({ nextNumber })
  }
}
