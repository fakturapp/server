import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import InvoiceSetting from '#models/team/invoice_setting'
import Company from '#models/team/company'

const personalizeValidator = vine.compile(
  vine.object({
    template: vine.string().trim().maxLength(30).optional(),
    accentColor: vine
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    billingType: vine.enum(['quick', 'detailed']).optional(),
    vatExemptReason: vine
      .enum(['none', 'not_subject', 'france_no_vat', 'outside_france'])
      .optional(),
    quotePrefix: vine.string().trim().maxLength(20).optional(),
    invoicePrefix: vine.string().trim().maxLength(20).optional(),
    currency: vine.string().trim().maxLength(3).optional(),
    language: vine.string().trim().maxLength(5).optional(),
    paymentConditions: vine.string().trim().maxLength(500).optional(),
    paymentMethods: vine.array(vine.string()).optional(),
  })
)

export default class CompletePersonalization {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!

    if (!user.currentTeamId) {
      return response.badRequest({ message: 'You must create a team first' })
    }

    const payload = await request.validateUsing(personalizeValidator)

    const quotePattern = payload.quotePrefix ? `${payload.quotePrefix}{annee}-{numero}` : undefined
    const invoicePattern = payload.invoicePrefix
      ? `${payload.invoicePrefix}{annee}-{numero}`
      : undefined

    let settings = await InvoiceSetting.findBy('teamId', user.currentTeamId)

    if (!settings) {
      settings = await InvoiceSetting.create({
        teamId: user.currentTeamId,
        template: payload.template || 'classique',
        accentColor: payload.accentColor || '#6366f1',
        billingType: payload.billingType || 'quick',
        paymentMethods: payload.paymentMethods?.length ? payload.paymentMethods : ['bank_transfer'],
        darkMode: false,
        documentFont: 'Lexend',
        eInvoicingEnabled: false,
        pdpSandbox: true,
        defaultShowNotes: true,
        defaultSignatureField: false,
        defaultVatExempt: payload.vatExemptReason === 'not_subject',
        defaultShowDeliveryAddress: false,
        defaultLanguage: payload.language || 'fr',
        quoteFilenamePattern: quotePattern || 'DEV-{annee}-{numero}',
        invoiceFilenamePattern: invoicePattern || 'FAC-{annee}-{numero}',
      })
    } else {
      if (payload.template) settings.template = payload.template
      if (payload.accentColor) settings.accentColor = payload.accentColor
      if (payload.billingType) settings.billingType = payload.billingType
      if (payload.vatExemptReason !== undefined)
        settings.defaultVatExempt = payload.vatExemptReason === 'not_subject'
      if (payload.paymentMethods?.length) settings.paymentMethods = payload.paymentMethods
      if (payload.language) settings.defaultLanguage = payload.language
      if (quotePattern) settings.quoteFilenamePattern = quotePattern
      if (invoicePattern) settings.invoiceFilenamePattern = invoicePattern
      await settings.save()
    }

    // Update Company fields (currency, paymentConditions) if provided
    if (payload.currency || payload.paymentConditions) {
      const company = await Company.findBy('teamId', user.currentTeamId)
      if (company) {
        if (payload.currency) company.currency = payload.currency
        if (payload.paymentConditions) company.paymentConditions = payload.paymentConditions
        await company.save()
      }
    }

    user.onboardingCompleted = true
    await user.save()

    return response.ok({ message: 'Onboarding completed' })
  }
}
