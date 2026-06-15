import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import InvoiceSetting from '#models/team/invoice_setting'
import invoiceBackgroundService from '#services/storage/invoice_background_service'

export default class InvoiceBackgroundDelete {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!

    if (!user.currentTeamId) {
      return response.notFound({ message: 'Aucune équipe sélectionnée' })
    }

    const teamId = user.currentTeamId
    const settings = await InvoiceSetting.findBy('teamId', teamId)
    const previousUrl = settings?.customBackgroundUrl ?? null

    if (settings) {
      settings.customBackgroundUrl = null
      await settings.save()
    }

    if (previousUrl) {
      try {
        await invoiceBackgroundService.purge(teamId, previousUrl)
      } catch (error) {
        logger.error(
          { err: error, userId: user.id, teamId, previousUrl },
          'invoice background purge failed'
        )
      }
    }

    return response.ok({ message: 'Fond personnalisé supprimé' })
  }
}
