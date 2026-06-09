import type { HttpContext } from '@adonisjs/core/http'
import Team from '#models/team/team'
import TeamMember from '#models/team/team_member'
import DocumentShare from '#models/collaboration/document_share'
import type { DocumentType } from '#models/collaboration/document_share'
import Invoice from '#models/invoice/invoice'
import Quote from '#models/quote/quote'
import CreditNote from '#models/credit_note/credit_note'
import InvoiceTransformer from '#transformers/invoice_transformer'
import QuoteTransformer from '#transformers/quote_transformer'
import CreditNoteTransformer from '#transformers/credit_note_transformer'
import teamEncryption from '#services/crypto/team_encryption_service'
import {
  decryptModelFields,
  decryptModelFieldsArray,
  ENCRYPTED_FIELDS,
} from '#services/crypto/field_encryption_helper'

const VALID_TYPES: DocumentType[] = ['invoice', 'quote', 'credit_note']

export default class Show {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!

    const documentType = request.param('documentType') as DocumentType
    const documentId = request.param('documentId') as string

    if (!VALID_TYPES.includes(documentType)) {
      return response.badRequest({ message: 'Invalid document type' })
    }

    let share = await DocumentShare.query()
      .where('document_type', documentType)
      .where('document_id', documentId)
      .where('shared_with_user_id', user.id)
      .where('status', 'active')
      .first()

    if (!share) {
      const pending = await DocumentShare.query()
        .where('document_type', documentType)
        .where('document_id', documentId)
        .where('status', 'pending')
        .whereRaw('LOWER(shared_with_email) = ?', [user.email.toLowerCase()])
        .first()
      if (pending) {
        pending.sharedWithUserId = user.id
        pending.status = 'active'
        await pending.save()
        share = pending
      }
    }

    if (!share) {
      return response.forbidden({
        message: 'You do not have access to this document',
        code: 'no_share_access',
      })
    }

    const team = await Team.find(share.teamId)
    if (!team) {
      return response.notFound({ message: 'Document not found' })
    }

    if (teamEncryption.requiresUserKek(team)) {
      return response.forbidden({
        message:
          'Ce document appartient à une équipe en mode Privé (chiffrement de bout en bout). Il ne peut pas être ouvert en dehors de cette équipe.',
        code: 'private_team_document',
      })
    }

    const membership = await TeamMember.query()
      .where('team_id', team.id)
      .where('status', 'active')
      .whereNotNull('encrypted_team_dek')
      .first()

    const dek = membership ? teamEncryption.unwrapDekForMembership(team, membership) : null
    if (!dek) {
      return response.internalServerError({ message: 'Unable to unlock the document' })
    }

    if (documentType === 'invoice') {
      const invoice = await Invoice.query()
        .where('id', documentId)
        .where('team_id', team.id)
        .preload('client')
        .preload('lines', (q) => q.orderBy('position', 'asc'))
        .first()
      if (!invoice) return response.notFound({ message: 'Document not found' })

      decryptModelFields(invoice, [...ENCRYPTED_FIELDS.invoice], dek)
      decryptModelFieldsArray(invoice.lines, [...ENCRYPTED_FIELDS.invoiceLine], dek)
      if (invoice.client) decryptModelFields(invoice.client, [...ENCRYPTED_FIELDS.client], dek)

      return response.ok({
        documentType,
        document: await ctx.serialize.withoutWrapping(InvoiceTransformer.transform(invoice)),
        shared: { permission: share.permission, isOwner: false },
      })
    }

    if (documentType === 'quote') {
      const quote = await Quote.query()
        .where('id', documentId)
        .where('team_id', team.id)
        .preload('client')
        .preload('lines', (q) => q.orderBy('position', 'asc'))
        .first()
      if (!quote) return response.notFound({ message: 'Document not found' })

      decryptModelFields(quote, [...ENCRYPTED_FIELDS.quote], dek)
      decryptModelFieldsArray(quote.lines, [...ENCRYPTED_FIELDS.quoteLine], dek)
      if (quote.client) decryptModelFields(quote.client, [...ENCRYPTED_FIELDS.client], dek)

      return response.ok({
        documentType,
        document: await ctx.serialize.withoutWrapping(QuoteTransformer.transform(quote)),
        shared: { permission: share.permission, isOwner: false },
      })
    }

    const creditNote = await CreditNote.query()
      .where('id', documentId)
      .where('team_id', team.id)
      .preload('client')
      .preload('lines', (q) => q.orderBy('position', 'asc'))
      .first()
    if (!creditNote) return response.notFound({ message: 'Document not found' })

    decryptModelFields(creditNote, [...ENCRYPTED_FIELDS.creditNote], dek)
    decryptModelFieldsArray(creditNote.lines, [...ENCRYPTED_FIELDS.creditNoteLine], dek)
    if (creditNote.client) decryptModelFields(creditNote.client, [...ENCRYPTED_FIELDS.client], dek)

    return response.ok({
      documentType,
      document: await ctx.serialize.withoutWrapping(CreditNoteTransformer.transform(creditNote)),
      shared: { permission: share.permission, isOwner: false },
    })
  }
}
