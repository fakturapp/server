import type { HttpContext } from '@adonisjs/core/http'
import AiQuotaService from '#services/ai/ai_quota_service'

export default class AiQuota {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const quota = await AiQuotaService.checkQuota(teamId)

    return response.ok({ quota })
  }
}
