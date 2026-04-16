import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Quote from '#models/quote/quote'
import Invoice from '#models/invoice/invoice'
import InvoiceLine from '#models/invoice/invoice_line'
import InvoiceSetting from '#models/team/invoice_setting'
import { encryptModelFields } from '#services/crypto/field_encryption_helper'
import { ApiError } from '#exceptions/api_error'
import { generateNextNumber } from '#services/documents/number_generator'

export default class ConvertQuote {
  async handle(ctx: HttpContext) {
    const { auth, params } = ctx
    const dek: Buffer = (ctx as any).dek
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      throw new ApiError('team_not_selected')
    }

    const quote = await Quote.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .preload('client')
      .preload('lines', (q) => q.orderBy('position', 'asc'))
      .first()

    if (!quote) {
      throw new ApiError('quote_not_found')
    }

    const existing = await Invoice.query()
      .where('team_id', teamId)
      .where('source_quote_id', quote.id)
      .first()

    if (existing) {
      throw new ApiError('quote_already_converted', {
        details: { invoiceId: existing.id, invoiceNumber: existing.invoiceNumber },
      })
    }

    const settings = await InvoiceSetting.query().where('team_id', teamId).first()
    let invoiceNumber: string

    if (settings?.nextInvoiceNumber) {
      invoiceNumber = settings.nextInvoiceNumber
      settings.nextInvoiceNumber = null
      await settings.save()
    } else {
      invoiceNumber = await generateNextNumber({
        teamId,
        table: 'invoices',
        numberColumn: 'invoice_number',
        pattern: settings?.invoiceFilenamePattern || 'FAK-{annee}-{numero}',
      })
    }

    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + 30)
    const dueDateStr = dueDate.toISOString().slice(0, 10)
    const issueDateStr = today.toISOString().slice(0, 10)

    const invoiceData: Record<string, any> = {
      teamId,
      clientId: quote.clientId,
      invoiceNumber,
      status: 'draft',
      subject: quote.subject,
      issueDate: issueDateStr,
      dueDate: dueDateStr,
      billingType: quote.billingType,
      accentColor: quote.accentColor,
      logoUrl: quote.logoUrl,
      language: quote.language,
      notes: quote.notes,
      acceptanceConditions: quote.acceptanceConditions,
      signatureField: quote.signatureField,
      documentTitle: 'Facture',
      freeField: quote.freeField,
      globalDiscountType: quote.globalDiscountType,
      globalDiscountValue: quote.globalDiscountValue,
      deliveryAddress: quote.deliveryAddress,
      clientSiren: quote.clientSiren,
      clientVatNumber: quote.clientVatNumber,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      sourceQuoteId: quote.id,
      paymentTerms: '30 jours net',
      clientSnapshot: quote.clientSnapshot,
      companySnapshot: quote.companySnapshot,
      vatExemptReason: quote.vatExemptReason,
    }

    encryptModelFields(invoiceData, ['documentTitle', 'paymentTerms'], dek)

    const invoice = await db.transaction(async (trx) => {
      const inv = await Invoice.create(invoiceData, { client: trx })

      for (const line of quote.lines) {
        await InvoiceLine.create(
          {
            invoiceId: inv.id,
            position: line.position,
            description: line.description,
            saleType: line.saleType,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unitPrice,
            vatRate: line.vatRate,
            total: line.total,
          },
          { client: trx }
        )
      }

      if (quote.status === 'draft' || quote.status === 'sent') {
        quote.status = 'accepted'
        quote.useTransaction(trx)
        await quote.save()
      }

      return inv
    })

    return ctx.response.created({
      message: 'Invoice created from quote',
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
    })
  }
}
