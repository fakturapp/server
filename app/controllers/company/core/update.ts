import type { HttpContext } from '@adonisjs/core/http'
import Company from '#models/team/company'
import InvoiceSetting from '#models/team/invoice_setting'
import { updateCompanyValidator } from '#validators/auth/onboarding_validators'
import { buildDefaultInvoiceSettings } from '#services/settings/default_invoice_settings'
import {
  encryptModelFields,
  decryptModelFields,
  ENCRYPTED_FIELDS,
} from '#services/crypto/field_encryption_helper'

export default class Update {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const dek: Buffer = (ctx as any).dek

    if (!user.currentTeamId) {
      return response.notFound({ message: 'No team found' })
    }

    const company = await Company.findBy('teamId', user.currentTeamId)

    if (!company) {
      return response.notFound({ message: 'No company found. Create one first.' })
    }

    const payload = await request.validateUsing(updateCompanyValidator)
    const settings = await InvoiceSetting.findBy('teamId', user.currentTeamId)
    const {
      paymentMethods,
      customPaymentMethod,
      ...companyPayload
    } = payload

    const data: Record<string, any> = { ...companyPayload }
    encryptModelFields(data, [...ENCRYPTED_FIELDS.company], dek)

    company.merge(data as Partial<typeof company>)
    await company.save()

    let nextSettings = settings
    if (paymentMethods !== undefined || customPaymentMethod !== undefined) {
      if (!nextSettings) {
        nextSettings = await InvoiceSetting.create(buildDefaultInvoiceSettings(user.currentTeamId))
      }

      if (paymentMethods !== undefined) {
        nextSettings.paymentMethods = paymentMethods
      }

      if (customPaymentMethod !== undefined) {
        nextSettings.customPaymentMethod = customPaymentMethod || null
      }

      await nextSettings.save()
    }

    decryptModelFields(company, [...ENCRYPTED_FIELDS.company], dek)

    return response.ok({
      message: 'Company updated successfully',
      company: Object.assign(company, {
        paymentMethods: nextSettings?.paymentMethods || ['bank_transfer'],
        customPaymentMethod: nextSettings?.customPaymentMethod || '',
      }),
    })
  }
}
