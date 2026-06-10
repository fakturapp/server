import type { HttpContext } from '@adonisjs/core/http'
import DocumentShareLink from '#models/collaboration/document_share_link'
import Team from '#models/team/team'
import TeamMember from '#models/team/team_member'
import InvoiceSetting from '#models/team/invoice_setting'
import Invoice from '#models/invoice/invoice'
import Quote from '#models/quote/quote'
import CreditNote from '#models/credit_note/credit_note'
import InvoiceTransformer from '#transformers/invoice_transformer'
import QuoteTransformer from '#transformers/quote_transformer'
import CreditNoteTransformer from '#transformers/credit_note_transformer'
import teamEncryption from '#services/crypto/team_encryption_service'
import { collaborationEnabled } from '#services/billing/plan_entitlements'
import {
  decryptModelFields,
  decryptModelFieldsArray,
  ENCRYPTED_FIELDS,
} from '#services/crypto/field_encryption_helper'

export default class GuestDocument {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const token = request.param('token') as string

    const link = await DocumentShareLink.query()
      .where('token', token)
      .where('is_active', true)
      .first()

    if (!link || link.isExpired) {
      return response.notFound({ message: 'Ce lien est invalide ou a été désactivé' })
    }

    if (!link.allowAnonymous || link.visibility !== 'anyone') {
      return response.forbidden({
        message: 'Ce lien nécessite un compte Faktur',
        code: 'login_required',
      })
    }

    const team = await Team.find(link.teamId)
    if (!team || !collaborationEnabled(team)) {
      return response.gone({ message: "Ce lien n'est plus actif" })
    }

    if (teamEncryption.requiresUserKek(team)) {
      return response.forbidden({
        message:
          'Ce document appartient à une équipe en mode Privé (chiffrement de bout en bout). Il ne peut pas être ouvert sans compte.',
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

    const settingsRow = await InvoiceSetting.findBy('team_id', team.id)
    const settings = {
      template: settingsRow?.template ?? 'classique',
      documentFont: settingsRow?.documentFont ?? 'Lexend',
      darkMode: settingsRow?.darkMode ?? false,
    }

    const base = {
      documentType: link.documentType,
      documentId: link.documentId,
      permission: 'viewer' as const,
      teamName: team.name,
      settings,
    }

    if (link.documentType === 'invoice') {
      const invoice = await Invoice.query()
        .where('id', link.documentId)
        .where('team_id', team.id)
        .preload('client')
        .preload('lines', (q) => q.orderBy('position', 'asc'))
        .first()
      if (!invoice) return response.notFound({ message: 'Document introuvable' })

      decryptModelFields(invoice, [...ENCRYPTED_FIELDS.invoice], dek)
      decryptModelFieldsArray(invoice.lines, [...ENCRYPTED_FIELDS.invoiceLine], dek)
      if (invoice.client) decryptModelFields(invoice.client, [...ENCRYPTED_FIELDS.client], dek)

      return response.ok({
        ...base,
        document: await ctx.serialize.withoutWrapping(InvoiceTransformer.transform(invoice)),
      })
    }

    if (link.documentType === 'quote') {
      const quote = await Quote.query()
        .where('id', link.documentId)
        .where('team_id', team.id)
        .preload('client')
        .preload('lines', (q) => q.orderBy('position', 'asc'))
        .first()
      if (!quote) return response.notFound({ message: 'Document introuvable' })

      decryptModelFields(quote, [...ENCRYPTED_FIELDS.quote], dek)
      decryptModelFieldsArray(quote.lines, [...ENCRYPTED_FIELDS.quoteLine], dek)
      if (quote.client) decryptModelFields(quote.client, [...ENCRYPTED_FIELDS.client], dek)

      return response.ok({
        ...base,
        document: await ctx.serialize.withoutWrapping(QuoteTransformer.transform(quote)),
      })
    }

    const creditNote = await CreditNote.query()
      .where('id', link.documentId)
      .where('team_id', team.id)
      .preload('client')
      .preload('lines', (q) => q.orderBy('position', 'asc'))
      .first()
    if (!creditNote) return response.notFound({ message: 'Document introuvable' })

    decryptModelFields(creditNote, [...ENCRYPTED_FIELDS.creditNote], dek)
    decryptModelFieldsArray(creditNote.lines, [...ENCRYPTED_FIELDS.creditNoteLine], dek)
    if (creditNote.client) decryptModelFields(creditNote.client, [...ENCRYPTED_FIELDS.client], dek)

    return response.ok({
      ...base,
      document: await ctx.serialize.withoutWrapping(CreditNoteTransformer.transform(creditNote)),
    })
  }
}
