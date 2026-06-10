import type { HttpContext } from '@adonisjs/core/http'
import DocumentShare from '#models/collaboration/document_share'
import DocumentAccessService from '#services/collaboration/document_access_service'
import teamEncryption from '#services/crypto/team_encryption_service'
import Invoice from '#models/invoice/invoice'
import Quote from '#models/quote/quote'
import CreditNote from '#models/credit_note/credit_note'

export default class SharedWithMe {
  async handle(ctx: HttpContext) {
    const { auth, response } = ctx
    const user = auth.user!

    await DocumentShare.query()
      .where('status', 'pending')
      .whereRaw('LOWER(shared_with_email) = ?', [user.email.toLowerCase()])
      .update({ shared_with_user_id: user.id, status: 'active' })

    const shares = await DocumentShare.query()
      .where('shared_with_user_id', user.id)
      .where('status', 'active')
      .preload('team')
      .preload('sharedBy')
      .orderBy('updated_at', 'desc')
      .limit(50)

    const accessService = new DocumentAccessService()
    const data: any[] = []

    for (const share of shares) {
      const document = await accessService.getDocument(
        share.documentType,
        share.documentId,
        share.teamId
      )
      if (!document) continue

      let number = ''
      if (document instanceof Invoice) number = document.invoiceNumber
      else if (document instanceof Quote) number = document.quoteNumber
      else if (document instanceof CreditNote) number = document.creditNoteNumber

      data.push({
        documentType: share.documentType,
        documentId: share.documentId,
        permission: share.permission,
        number,
        teamName: share.team?.name ?? null,
        sharedBy: share.sharedBy?.fullName ?? share.sharedBy?.email ?? null,
        locked: share.team ? teamEncryption.requiresUserKek(share.team) : false,
        updatedAt: document.updatedAt?.toISO() ?? null,
      })
    }

    return response.ok({ data })
  }
}
