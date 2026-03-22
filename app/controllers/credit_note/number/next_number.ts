import type { HttpContext } from '@adonisjs/core/http'
import CreditNote from '#models/credit_note/credit_note'

export default class NextNumber {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const currentYear = new Date().getFullYear().toString()
    const prefix = `AV-${currentYear}-`

    const lastCreditNote = await CreditNote.query()
      .where('team_id', teamId)
      .where('credit_note_number', 'like', `${prefix}%`)
      .orderBy('created_at', 'desc')
      .first()

    let nextNum = 1
    if (lastCreditNote) {
      const numStr = lastCreditNote.creditNoteNumber.slice(prefix.length)
      const parsed = Number.parseInt(numStr, 10)
      if (!Number.isNaN(parsed)) nextNum = parsed + 1
    }

    return response.ok({ nextNumber: `${prefix}${nextNum.toString().padStart(3, '0')}` })
  }
}
