import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Quote from '#models/quote/quote'
import Invoice from '#models/invoice/invoice'
import InvoiceLine from '#models/invoice/invoice_line'
import InvoiceSetting from '#models/team/invoice_setting'
import documentNumberingService from '#services/documents/document_numbering_service'
import { encryptModelFields } from '#services/crypto/field_encryption_helper'

export default class ConvertQuote {
  async handle(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const dek: Buffer = (ctx as any).dek
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const quote = await Quote.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .preload('client')
      .preload('lines', (q) => q.orderBy('position', 'asc'))
      .first()

    if (!quote) {
      return response.notFound({ message: 'Quote not found' })
    }

    const settings = await InvoiceSetting.query().where('team_id', teamId).first()

    const currentYear = new Date().getFullYear().toString()
    const fallbackPattern = 'FAC-{annee}-{numero}'
    const numberPattern = settings?.invoiceNumberPattern || settings?.invoiceFilenamePattern
    const prefix = documentNumberingService.buildSequencePrefix(
      numberPattern,
      fallbackPattern,
      currentYear
    )

    let manualNumber: string | null = settings?.nextInvoiceNumber
      ? documentNumberingService.normalizePattern(settings.nextInvoiceNumber, fallbackPattern)
      : null

    const resolveInvoiceNumber = async (): Promise<{ number: string; fromManual: boolean }> => {
      if (manualNumber) {
        const taken = await Invoice.query()
          .where('team_id', teamId)
          .where('invoice_number', manualNumber)
          .first()
        if (!taken) return { number: manualNumber, fromManual: true }
        manualNumber = null
      }

      const existing = await Invoice.query()
        .where('team_id', teamId)
        .where('invoice_number', 'like', `${prefix}%`)
        .select('invoice_number')

      let maxNumber = 0
      for (const row of existing) {
        const parsed = Number.parseInt(row.invoiceNumber.slice(prefix.length), 10)
        if (Number.isFinite(parsed) && parsed > maxNumber) maxNumber = parsed
      }

      return {
        number: `${prefix}${(maxNumber + 1).toString().padStart(3, '0')}`,
        fromManual: false,
      }
    }

    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + 30)
    const dueDateStr = dueDate.toISOString().slice(0, 10)
    const issueDateStr = today.toISOString().slice(0, 10)

    const invoiceData: Record<string, any> = {
      teamId,
      clientId: quote.clientId,
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
      clientSnapshot: quote.clientSnapshot,
      companySnapshot: quote.companySnapshot,
      showQuantityColumn: quote.showQuantityColumn,
      showUnitColumn: quote.showUnitColumn,
      showUnitPriceColumn: quote.showUnitPriceColumn,
      showVatColumn: quote.showVatColumn,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      sourceQuoteId: quote.id,
      paymentTerms: '30 jours net',
    }

    encryptModelFields(invoiceData, ['documentTitle', 'paymentTerms'], dek)

    let invoice: Invoice | null = null
    let usedManual = false

    for (let attempt = 0; attempt < 6; attempt++) {
      const resolved = await resolveInvoiceNumber()
      invoiceData.invoiceNumber = resolved.number

      try {
        invoice = await db.transaction(async (trx) => {
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
          return inv
        })
        usedManual = resolved.fromManual
        break
      } catch (err: any) {
        const isDuplicate =
          err?.code === '23505' ||
          (typeof err?.message === 'string' && err.message.includes('duplicate key'))
        if (!isDuplicate) throw err
        manualNumber = null
      }
    }

    if (!invoice) {
      return response.conflict({ message: 'Impossible de générer un numéro de facture unique' })
    }

    if (usedManual && settings) {
      settings.nextInvoiceNumber = null
      await settings.save()
    }

    return response.created({
      message: 'Invoice created from quote',
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
    })
  }
}
