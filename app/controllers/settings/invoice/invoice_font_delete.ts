import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import InvoiceSetting from '#models/team/invoice_setting'
import storageService from '#services/storage/storage_service'

export default class InvoiceFontDelete {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!

    if (!user.currentTeamId) {
      return response.notFound({ message: 'Aucune équipe sélectionnée' })
    }

    const teamId = user.currentTeamId
    const settings = await InvoiceSetting.findBy('teamId', teamId)
    const previousUrl = settings?.customFontUrl ?? null

    if (settings) {
      if (settings.documentFont === settings.customFontName) settings.documentFont = 'Lexend'
      settings.customFontUrl = null
      settings.customFontName = null
      await settings.save()
    }

    if (previousUrl) {
      try {
        await storageService.purgeByPublicUrl(teamId, previousUrl)
      } catch (error) {
        logger.error({ err: error, userId: user.id, teamId, previousUrl }, 'invoice font purge failed')
      }
    }

    return response.ok({ message: 'Police personnalisée supprimée' })
  }
}
