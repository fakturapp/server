import type { HttpContext } from '@adonisjs/core/http'

const MODES = ['light', 'dark', 'system']

export default class UpdateUiTheme {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const raw = request.input('theme')

    if (raw === null || raw === '') {
      user.uiTheme = null
      await user.save()
      return response.ok({ message: 'Thème réinitialisé', uiTheme: null })
    }

    if (typeof raw !== 'string' || raw.length > 600) {
      return response.unprocessableEntity({ message: 'Thème invalide' })
    }

    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      return response.unprocessableEntity({ message: 'Thème invalide' })
    }

    const mode = MODES.includes(parsed?.mode) ? parsed.mode : 'system'
    const accent =
      typeof parsed?.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.accent)
        ? parsed.accent
        : null
    const background =
      typeof parsed?.background === 'string' && parsed.background.length <= 40
        ? parsed.background
        : null

    const theme = JSON.stringify({ mode, accent, background })
    user.uiTheme = theme
    await user.save()

    return response.ok({ message: 'Thème enregistré', uiTheme: theme })
  }
}
