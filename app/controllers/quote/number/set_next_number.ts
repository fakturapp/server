import type { HttpContext } from '@adonisjs/core/http'
import Quote from '#models/quote/quote'
import InvoiceSetting from '#models/team/invoice_setting'
import { buildDefaultInvoiceSettings } from '#services/settings/default_invoice_settings'

export default class SetNextNumber {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const result = await Quote.query().where('team_id', teamId).count('* as cnt').first()

    const count = Number(result?.$extras.cnt ?? 0)
    if (count > 0) {
      return response.badRequest({ message: 'Cannot set starting number after documents exist' })
    }

    const { nextNumber } = request.only(['nextNumber'])
    if (!nextNumber || typeof nextNumber !== 'string') {
      return response.badRequest({ message: 'nextNumber is required' })
    }

    const normalizedNextNumber = nextNumber.trim()
    if (!normalizedNextNumber) {
      return response.badRequest({ message: 'nextNumber is required' })
    }

    if (/[{}]/.test(normalizedNextNumber)) {
      return response.badRequest({
        message: 'Use a concrete quote number, not a placeholder pattern',
      })
    }

    let settings = await InvoiceSetting.query().where('team_id', teamId).first()
    if (!settings) {
      settings = await InvoiceSetting.create(buildDefaultInvoiceSettings(teamId))
    }

    settings.nextQuoteNumber = normalizedNextNumber
    await settings.save()

    return response.ok({ message: 'Next number set', nextNumber: normalizedNextNumber })
  }
}
