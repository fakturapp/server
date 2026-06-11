import type { HttpContext } from '@adonisjs/core/http'
import uiBackgroundService from '#services/storage/ui_background_service'
import { parseStoredUiTheme, serializeUiTheme } from '#services/account/ui_theme'

export default class DeleteUiBackground {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!
    const theme = parseStoredUiTheme(user.uiTheme)

    if (theme.customBackgroundUrl) {
      await uiBackgroundService.purge(theme.customBackgroundUrl, user.id)
    }

    theme.customBackgroundUrl = null
    if (theme.background === 'custom') {
      theme.background = null
    }

    const serialized = serializeUiTheme(theme)
    user.uiTheme = serialized
    await user.save()

    return response.ok({ message: 'Fond personnalisé supprimé', uiTheme: serialized })
  }
}
