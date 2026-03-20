import type { HttpContext } from '@adonisjs/core/http'
import CreditNote from '#models/credit_note/credit_note'
import Invoice from '#models/invoice/invoice'
import {
  decryptModelFields,
  decryptModelFieldsArray,
  ENCRYPTED_FIELDS,
} from '#services/crypto/field_encryption_helper'

export default class Show {
  async handle(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId
    const dek: Buffer = (ctx as any).dek

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const creditNote = await CreditNote.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .preload('client')
      .preload('lines', (q) => q.orderBy('position', 'asc'))
      .first()

    if (!creditNote) {
      return response.notFound({ message: 'Credit note not found' })
    }

    decryptModelFields(creditNote, [...ENCRYPTED_FIELDS.creditNote], dek)
    decryptModelFieldsArray(creditNote.lines, [...ENCRYPTED_FIELDS.creditNoteLine], dek)

    if (creditNote.client) {
      decryptModelFields(creditNote.client, [...ENCRYPTED_FIELDS.client], dek)
    }

    let sourceInvoice: { id: string; invoiceNumber: string } | null = null
    if (creditNote.sourceInvoiceId) {
      const invoice = await Invoice.find(creditNote.sourceInvoiceId)
      if (invoice) {
        sourceInvoice = { id: invoice.id, invoiceNumber: invoice.invoiceNumber }
      }
    }

    return response.ok({
      creditNote: {
        id: creditNote.id,
        creditNoteNumber: creditNote.creditNoteNumber,
        status: creditNote.status,
        reason: creditNote.reason,
        subject: creditNote.subject,
        issueDate: creditNote.issueDate,
        billingType: creditNote.billingType,
        accentColor: creditNote.accentColor,
        logoUrl: creditNote.logoUrl,
        language: creditNote.language,
        notes: creditNote.notes,
        acceptanceConditions: creditNote.acceptanceConditions,
        signatureField: creditNote.signatureField,
        documentTitle: creditNote.documentTitle,
        freeField: creditNote.freeField,
        globalDiscountType: creditNote.globalDiscountType,
        globalDiscountValue: creditNote.globalDiscountValue,
        deliveryAddress: creditNote.deliveryAddress,
        clientSiren: creditNote.clientSiren,
        clientVatNumber: creditNote.clientVatNumber,
        subtotal: creditNote.subtotal,
        taxAmount: creditNote.taxAmount,
        total: creditNote.total,
        sourceInvoiceId: creditNote.sourceInvoiceId,
        sourceInvoice,
        comment: creditNote.comment,
        vatExemptReason: creditNote.vatExemptReason,
        clientId: creditNote.clientId,
        client: creditNote.client
          ? {
              id: creditNote.client.id,
              type: creditNote.client.type,
              displayName: creditNote.client.displayName,
              companyName: creditNote.client.companyName,
              firstName: creditNote.client.firstName,
              lastName: creditNote.client.lastName,
              email: creditNote.client.email,
              phone: creditNote.client.phone,
              address: creditNote.client.address,
              addressComplement: creditNote.client.addressComplement,
              postalCode: creditNote.client.postalCode,
              city: creditNote.client.city,
              country: creditNote.client.country,
              siren: creditNote.client.siren,
              vatNumber: creditNote.client.vatNumber,
            }
          : null,
        lines: creditNote.lines.map((l) => ({
          id: l.id,
          position: l.position,
          description: l.description,
          saleType: l.saleType,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          vatRate: l.vatRate,
          total: l.total,
        })),
        createdAt: creditNote.createdAt.toISO(),
      },
    })
  }
}
