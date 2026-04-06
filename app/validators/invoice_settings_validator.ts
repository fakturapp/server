import vine from '@vinejs/vine'

const bool = () => vine.boolean().optional().parse((v) => {
  if (v === 1 || v === '1' || v === 'true') return true
  if (v === 0 || v === '0' || v === 'false') return false
  return v
})

export const updateInvoiceSettingsValidator = vine.compile(
  vine.object({
    billingType: vine.enum(['quick', 'detailed']).optional(),
    accentColor: vine
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    paymentMethods: vine.array(vine.enum(['bank_transfer', 'cash', 'custom'])).optional(),
    logoSource: vine.enum(['custom', 'company']).optional(),
    customPaymentMethod: vine.string().trim().maxLength(255).optional(),
    template: vine.string().trim().maxLength(30).optional(),
    darkMode: bool(),
    documentFont: vine.string().trim().maxLength(50).optional(),
    eInvoicingEnabled: bool(),
    pdpProvider: vine.string().trim().maxLength(50).optional().nullable(),
    pdpApiKey: vine.string().trim().maxLength(500).optional().nullable(),
    pdpSandbox: bool(),
    defaultSubject: vine.string().trim().maxLength(500).optional().nullable(),
    defaultAcceptanceConditions: vine.string().trim().maxLength(2000).optional().nullable(),
    defaultSignatureField: bool(),
    defaultFreeField: vine.string().trim().maxLength(2000).optional().nullable(),
    defaultShowNotes: bool(),
    defaultVatExempt: bool(),
    defaultFooterText: vine.string().trim().maxLength(50).optional().nullable(),
    defaultShowDeliveryAddress: bool(),
    defaultLanguage: vine.string().trim().maxLength(5).optional(),
    quoteFilenamePattern: vine.string().trim().maxLength(255).optional(),
    invoiceFilenamePattern: vine.string().trim().maxLength(255).optional(),
    footerMode: vine.enum(['company_info', 'vat_exempt', 'custom']).optional(),
    logoBorderRadius: vine.number().min(0).max(50).optional(),
    collaborationEnabled: bool(),
    aiEnabled: bool(),
    aiProvider: vine.enum(['groq']).optional(),
    aiModel: vine.string().trim().maxLength(100).optional(),
  })
)
