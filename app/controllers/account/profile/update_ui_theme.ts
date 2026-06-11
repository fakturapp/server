import type { HttpContext } from '@adonisjs/core/http'
import {
  normalizeUiTheme,
  parseStoredUiTheme,
  serializeUiTheme,
} from '#services/account/ui_theme'

export default class UpdateUiTheme {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const raw = request.input('theme')

    if (raw === null || raw === '') {
      user.uiTheme = null
      await user.save()
      return response.ok({ message: 'Thème réinitialisé', uiTheme: null })
    }

    if (typeof raw !== 'string' || raw.length > 1200) {
      return response.unprocessableEntity({ message: 'Thème invalide' })
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return response.unprocessableEntity({ message: 'Thème invalide' })
    }

    const next = normalizeUiTheme(parsed)
    const current = parseStoredUiTheme(user.uiTheme)

    if (next.customBackgroundUrl !== current.customBackgroundUrl) {
      next.customBackgroundUrl = current.customBackgroundUrl
    }
    if (next.background === 'custom' && !next.customBackgroundUrl) {
      next.background = null
    }

    const theme = serializeUiTheme(next)
    user.uiTheme = theme
    await user.save()

    return response.ok({ message: 'Thème enregistré', uiTheme: theme })
  }
}
