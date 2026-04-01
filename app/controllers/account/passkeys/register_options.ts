import type { HttpContext } from '@adonisjs/core/http'
import passkeyService from '#services/auth/passkey_service'

export default class RegisterOptions {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!

    const options = await passkeyService.generateRegistrationOptions(user.id, user.email)

    return response.ok(options)
  }
}
