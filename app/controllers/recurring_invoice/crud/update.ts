import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import RecurringInvoice from '#models/recurring_invoice/recurring_invoice'
import RecurringInvoiceLine from '#models/recurring_invoice/recurring_invoice_line'
import { createRecurringInvoiceValidator } from '#validators/recurring_invoice_validator'
import { encryptModelFields, ENCRYPTED_FIELDS } from '#services/crypto/field_encryption_helper'

export default class Update {
  async handle(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId
    const dek: Buffer = (ctx as any).dek

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const recurring = await RecurringInvoice.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .first()

    if (!recurring) {
      return response.notFound({ message: 'Recurring invoice not found' })
    }

    const payload = await request.validateUsing(createRecurringInvoiceValidator)

    const linesData = payload.lines.map((line, index) => {
      const lineTotal = line.quantity * line.unitPrice
      return {
        position: index,
        description: line.description,
        saleType: line.saleType || null,
        quantity: line.quantity,
        unit: line.unit || null,
        unitPrice: line.unitPrice,
        vatRate: line.vatRate,
        total: lineTotal,
      }
    })

    const updateData: Record<string, any> = {
      clientId: payload.clientId || null,
      name: payload.name,
      frequency: payload.frequency,
      customIntervalDays: payload.frequency === 'custom' ? payload.customIntervalDays || 30 : null,
      startDate: payload.startDate,
      nextExecutionDate: payload.startDate,
      endDate: payload.endDate || null,
      dueDays: payload.dueDays ?? 30,
      subject: payload.subject || null,
      billingType: payload.billingType,
      accentColor: payload.accentColor,
      logoUrl: payload.logoUrl || null,
      language: payload.language || 'fr',
      notes: payload.notes || null,
      acceptanceConditions: payload.acceptanceConditions || null,
      signatureField: payload.signatureField ?? false,
      documentTitle: payload.documentTitle || null,
      freeField: payload.freeField || null,
      globalDiscountType: payload.globalDiscountType || 'none',
      globalDiscountValue: payload.globalDiscountValue || 0,
      deliveryAddress: payload.deliveryAddress || null,
      clientSiren: payload.clientSiren || null,
      clientVatNumber: payload.clientVatNumber || null,
      paymentTerms: payload.paymentTerms || null,
      paymentMethod: payload.paymentMethod || null,
      bankAccountId: payload.bankAccountId || null,
      vatExemptReason: payload.vatExemptReason || 'none',
    }

    encryptModelFields(updateData, [...ENCRYPTED_FIELDS.recurringInvoice], dek)

    await db.transaction(async (trx) => {
      recurring.useTransaction(trx)
      recurring.merge(updateData)
      await recurring.save()

      await RecurringInvoiceLine.query({ client: trx })
        .where('recurring_invoice_id', recurring.id)
        .delete()

      for (const lineData of linesData) {
        const lineRecord: Record<string, any> = {
          recurringInvoiceId: recurring.id,
          ...lineData,
          total: Math.round(lineData.total * 100) / 100,
        }
        encryptModelFields(lineRecord, [...ENCRYPTED_FIELDS.recurringInvoiceLine], dek)
        await RecurringInvoiceLine.create(lineRecord, { client: trx })
      }
    })

    return response.ok({
      message: 'Recurring invoice updated',
      recurringInvoice: { id: recurring.id, name: payload.name },
    })
  }
}
