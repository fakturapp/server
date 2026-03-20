import vine from '@vinejs/vine'

export const createRecurringInvoiceValidator = vine.compile(
  vine.object({
    clientId: vine.string().trim().optional(),
    name: vine.string().trim().maxLength(255),
    frequency: vine.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'custom']),
    customIntervalDays: vine.number().min(1).optional(),
    startDate: vine.string().trim(),
    endDate: vine.string().trim().optional(),
    dueDays: vine.number().min(0).optional(),

    // Invoice template
    subject: vine.string().trim().maxLength(255).optional(),
    billingType: vine.enum(['quick', 'detailed']),
    accentColor: vine.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
    logoUrl: vine.string().trim().optional(),
    language: vine.enum(['fr', 'en']).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    acceptanceConditions: vine.string().trim().maxLength(2000).optional(),
    signatureField: vine.boolean().optional(),
    documentTitle: vine.string().trim().maxLength(255).optional(),
    freeField: vine.string().trim().maxLength(2000).optional(),
    globalDiscountType: vine.enum(['none', 'percentage', 'fixed']).optional(),
    globalDiscountValue: vine.number().min(0).optional(),
    deliveryAddress: vine.string().trim().maxLength(500).optional(),
    clientSiren: vine.string().trim().maxLength(20).optional(),
    clientVatNumber: vine.string().trim().maxLength(30).optional(),
    paymentTerms: vine.string().trim().maxLength(255).optional(),
    paymentMethod: vine.string().trim().maxLength(50).optional(),
    bankAccountId: vine.string().trim().optional(),
    vatExemptReason: vine.enum(['none', 'not_subject', 'france_no_vat', 'outside_france']).optional(),
    lines: vine.array(
      vine.object({
        description: vine.string().trim().maxLength(500),
        saleType: vine.string().trim().maxLength(50).optional(),
        quantity: vine.number().min(0),
        unit: vine.string().trim().maxLength(20).optional(),
        unitPrice: vine.number(),
        vatRate: vine.number().min(0).max(100),
      })
    ),
  })
)
