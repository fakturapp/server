import type { HttpContext } from '@adonisjs/core/http'
import RecurringInvoice from '#models/recurring_invoice/recurring_invoice'
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

    const active = request.input('active', '')

    const query = RecurringInvoice.query()
      .where('team_id', teamId)
      .preload('client')
      .preload('lines', (q) => q.orderBy('position', 'asc'))
      .orderBy('created_at', 'desc')

    if (active === 'true') {
      query.where('is_active', true)
    } else if (active === 'false') {
      query.where('is_active', false)
    }

    const recurringInvoices = await query

    decryptModelFieldsArray(recurringInvoices, [...ENCRYPTED_FIELDS.recurringInvoice], dek)

    for (const ri of recurringInvoices) {
      if (ri.client) {
        decryptModelFields(ri.client, [...ENCRYPTED_FIELDS.client], dek)
      }
      decryptModelFieldsArray(ri.lines, [...ENCRYPTED_FIELDS.recurringInvoiceLine], dek)
    }

    // Calculate template totals from lines
    const list = recurringInvoices.map((ri) => {
      let subtotal = 0
      let taxAmount = 0
      for (const line of ri.lines) {
        const lt = line.quantity * line.unitPrice
        subtotal += lt
        taxAmount += lt * (line.vatRate / 100)
      }

      let discountAmount = 0
      if (ri.globalDiscountType === 'percentage' && ri.globalDiscountValue > 0) {
        discountAmount = subtotal * (ri.globalDiscountValue / 100)
      } else if (ri.globalDiscountType === 'fixed' && ri.globalDiscountValue > 0) {
        discountAmount = ri.globalDiscountValue
      }

      const total = subtotal + taxAmount - discountAmount

      return {
        id: ri.id,
        name: ri.name,
        frequency: ri.frequency,
        customIntervalDays: ri.customIntervalDays,
        startDate: ri.startDate,
        nextExecutionDate: ri.nextExecutionDate,
        endDate: ri.endDate,
        isActive: ri.isActive,
        lastGeneratedAt: ri.lastGeneratedAt?.toISO() || null,
        generationCount: ri.generationCount,
        clientName: ri.client?.displayName || null,
        clientId: ri.clientId,
        subject: ri.subject,
        total: Math.round(total * 100) / 100,
        createdAt: ri.createdAt.toISO(),
      }
    })

    return response.ok({ recurringInvoices: list })
  }
}
