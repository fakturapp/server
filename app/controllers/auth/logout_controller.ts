import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class LogoutController {
  async handle({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }
    return response.ok({ message: 'Logged out successfully' })
  }
}
