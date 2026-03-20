import type { HttpContext } from '@adonisjs/core/http'
import RecurringInvoice from '#models/recurring_invoice/recurring_invoice'
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

    const recurring = await RecurringInvoice.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .preload('client')
      .preload('lines', (q) => q.orderBy('position', 'asc'))
      .first()

    if (!recurring) {
      return response.notFound({ message: 'Recurring invoice not found' })
    }

    decryptModelFields(recurring, [...ENCRYPTED_FIELDS.recurringInvoice], dek)
    decryptModelFieldsArray(recurring.lines, [...ENCRYPTED_FIELDS.recurringInvoiceLine], dek)

    if (recurring.client) {
      decryptModelFields(recurring.client, [...ENCRYPTED_FIELDS.client], dek)
    }

    return response.ok({
      recurringInvoice: {
        id: recurring.id,
        name: recurring.name,
        frequency: recurring.frequency,
        customIntervalDays: recurring.customIntervalDays,
        startDate: recurring.startDate,
        nextExecutionDate: recurring.nextExecutionDate,
        endDate: recurring.endDate,
        isActive: recurring.isActive,
        lastGeneratedAt: recurring.lastGeneratedAt?.toISO() || null,
        generationCount: recurring.generationCount,
        dueDays: recurring.dueDays,
        subject: recurring.subject,
        billingType: recurring.billingType,
        accentColor: recurring.accentColor,
        logoUrl: recurring.logoUrl,
        language: recurring.language,
        notes: recurring.notes,
        acceptanceConditions: recurring.acceptanceConditions,
        signatureField: recurring.signatureField,
        documentTitle: recurring.documentTitle,
        freeField: recurring.freeField,
        globalDiscountType: recurring.globalDiscountType,
        globalDiscountValue: recurring.globalDiscountValue,
        deliveryAddress: recurring.deliveryAddress,
        clientSiren: recurring.clientSiren,
        clientVatNumber: recurring.clientVatNumber,
        paymentTerms: recurring.paymentTerms,
        paymentMethod: recurring.paymentMethod,
        bankAccountId: recurring.bankAccountId,
        vatExemptReason: recurring.vatExemptReason,
        clientId: recurring.clientId,
        client: recurring.client
          ? {
              id: recurring.client.id,
              type: recurring.client.type,
              displayName: recurring.client.displayName,
              companyName: recurring.client.companyName,
              firstName: recurring.client.firstName,
              lastName: recurring.client.lastName,
              email: recurring.client.email,
              phone: recurring.client.phone,
              address: recurring.client.address,
              addressComplement: recurring.client.addressComplement,
              postalCode: recurring.client.postalCode,
              city: recurring.client.city,
              country: recurring.client.country,
              siren: recurring.client.siren,
              vatNumber: recurring.client.vatNumber,
            }
          : null,
        lines: recurring.lines.map((l) => ({
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
        createdAt: recurring.createdAt.toISO(),
      },
    })
  }
}
