import type { HttpContext } from '@adonisjs/core/http'
import passkeyService from '#services/auth/passkey_service'

export default class LoginOptions {
  async handle({ request, response }: HttpContext) {
    const { email } = request.only(['email'])

    // Cleanup expired challenges in background
    passkeyService.cleanupExpiredChallenges().catch(() => {})

    const options = await passkeyService.generateAuthenticationOptions(email || undefined)

    return response.ok(options)
  }
}
