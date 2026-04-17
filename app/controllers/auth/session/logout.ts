import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/account/user'
import { clearAuthSessionCookies } from '#services/auth/auth_cookie_service'

export default class Logout {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const revokeAll = Boolean(request.input('revokeAll', false))

    if (revokeAll) {
      await db.from('auth_access_tokens').where('tokenable_id', user.id).delete()
      clearAuthSessionCookies(response)
      return response.ok({ message: 'Logged out from all sessions' })
    }

    await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    clearAuthSessionCookies(response)
    return response.ok({ message: 'Logged out successfully' })
  }
}
