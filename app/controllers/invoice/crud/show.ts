import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Invoice from '#models/invoice/invoice'
import PaymentLink from '#models/invoice/payment_link'
import Quote from '#models/quote/quote'
import InvoiceTransformer from '#transformers/invoice_transformer'
import {
  decryptModelFields,
  decryptModelFieldsArray,
  ENCRYPTED_FIELDS,
} from '#services/crypto/field_encryption_helper'
import { ApiError } from '#exceptions/api_error'

export default class Show {
  async handle(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId
    const dek: Buffer = (ctx as any).dek

    if (!teamId) {
      throw new ApiError('team_not_selected')
    }

    const invoice = await Invoice.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .preload('client')
      .preload('lines', (q) => q.orderBy('position', 'asc'))
      .preload('payments', (q) => q.orderBy('payment_date', 'desc'))
      .preload('creditNotes', (q) => q.orderBy('created_at', 'desc'))
      .first()

    if (!invoice) {
      throw new ApiError('invoice_not_found')
    }

    if (invoice.status === 'sent' && invoice.dueDate) {
      const today = DateTime.now().toSQLDate()!
      if (invoice.dueDate < today) {
        invoice.status = 'overdue'
        await invoice.save()
      }
    }

    decryptModelFields(invoice, [...ENCRYPTED_FIELDS.invoice], dek)

    decryptModelFieldsArray(invoice.lines, [...ENCRYPTED_FIELDS.invoiceLine], dek)
    decryptModelFieldsArray(invoice.payments, [...ENCRYPTED_FIELDS.invoicePayment], dek)

    if (invoice.client) {
      decryptModelFields(invoice.client, [...ENCRYPTED_FIELDS.client], dek)
    }

    const paymentLink = await PaymentLink.query()
      .where('invoice_id', invoice.id)
      .where('team_id', teamId)
      .orderBy('created_at', 'desc')
      .first()

    let sourceQuote: { id: string; quoteNumber: string } | null = null
    if (invoice.sourceQuoteId) {
      const quote = await Quote.find(invoice.sourceQuoteId)
      if (quote) {
        sourceQuote = { id: quote.id, quoteNumber: quote.quoteNumber }
      }
    }

    const payments = invoice.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      notes: p.notes,
    }))

    const creditNotes = invoice.creditNotes.map((cn) => ({
      id: cn.id,
      creditNoteNumber: cn.creditNoteNumber,
      status: cn.status,
      total: Number(cn.total),
      issueDate: cn.issueDate,
    }))

    return response.ok({
      invoice: {
        ...(await ctx.serialize.withoutWrapping(InvoiceTransformer.transform(invoice))),
        sourceQuote,
        payments,
        creditNotes,
        paymentLink: paymentLink
          ? {
              id: paymentLink.id,
              isActive: paymentLink.isActive,
              isExpired: paymentLink.isExpired,
              isPasswordProtected: !!paymentLink.passwordHash,
              paidAt: paymentLink.paidAt?.toISO() || null,
              confirmedAt: paymentLink.confirmedAt?.toISO() || null,
              expiresAt: paymentLink.expiresAt?.toISO() || null,
            }
          : null,
      },
    })
  }
}
