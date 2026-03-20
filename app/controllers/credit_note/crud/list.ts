import type { HttpContext } from '@adonisjs/core/http'
import CreditNote from '#models/credit_note/credit_note'
import {
  decryptModelFields,
  decryptModelFieldsArray,
  ENCRYPTED_FIELDS,
} from '#services/crypto/field_encryption_helper'

export default class List {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId
    const dek: Buffer = (ctx as any).dek

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const status = request.input('status', '')
    const page = request.input('page', 1)
    const perPage = request.input('perPage', 20)

    const query = CreditNote.query()
      .where('team_id', teamId)
      .preload('client')
      .orderBy('created_at', 'desc')

    if (status) {
      query.where('status', status)
    }

    const search = request.input('search', '')
    if (search) {
      query.whereILike('credit_note_number', `%${search}%`)
    }

    const result = await query.paginate(page, perPage)
    const creditNotes = result.all()

    decryptModelFieldsArray(creditNotes, [...ENCRYPTED_FIELDS.creditNote], dek)

    for (const cn of creditNotes) {
      if (cn.client) {
        decryptModelFields(cn.client, [...ENCRYPTED_FIELDS.client], dek)
      }
    }

    const creditNotesList = creditNotes.map((cn) => ({
      id: cn.id,
      creditNoteNumber: cn.creditNoteNumber,
      status: cn.status,
      subject: cn.subject,
      reason: cn.reason,
      issueDate: cn.issueDate,
      subtotal: cn.subtotal,
      taxAmount: cn.taxAmount,
      total: cn.total,
      clientName: cn.client?.displayName || null,
      clientId: cn.clientId,
      sourceInvoiceId: cn.sourceInvoiceId,
      createdAt: cn.createdAt.toISO(),
    }))

    return response.ok({
      creditNotes: creditNotesList,
      meta: {
        total: result.total,
        perPage: result.perPage,
        currentPage: result.currentPage,
        lastPage: result.lastPage,
      },
    })
  }
}
