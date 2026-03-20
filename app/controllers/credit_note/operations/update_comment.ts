import type { HttpContext } from '@adonisjs/core/http'
import CreditNote from '#models/credit_note/credit_note'
import { encryptModelFields } from '#services/crypto/field_encryption_helper'

export default class UpdateComment {
  async handle(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId
    const dek: Buffer = (ctx as any).dek

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

    const { comment } = request.only(['comment'])
    const data: Record<string, any> = { comment: comment || null }
    encryptModelFields(data, ['comment'], dek)

    creditNote.merge(data)
    await creditNote.save()

    return response.ok({ message: 'Comment updated' })
  }
}
