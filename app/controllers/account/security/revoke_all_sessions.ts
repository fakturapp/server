import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class RevokeAllSessions {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const keepCurrent = Boolean(request.input('keepCurrent', false))
    const currentId = keepCurrent ? String(user.currentAccessToken.identifier) : null

    const query = db.from('auth_access_tokens').where('tokenable_id', user.id)
    if (currentId) {
      query.whereNot('id', currentId)
    }

    const deleted = await query.delete()

    return response.ok({
      message: 'Sessions revoked',
      count: typeof deleted === 'number' ? deleted : 0,
      keptCurrent: keepCurrent,
    })
  }
}
