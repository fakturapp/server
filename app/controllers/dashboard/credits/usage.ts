import type { HttpContext } from '@adonisjs/core/http'
import Team from '#models/team/team'
import apiCreditService from '#services/api/api_credit_service'

export default class Usage {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId
    if (!teamId) return response.badRequest({ message: 'No team selected' })

    const team = await Team.find(teamId)
    const usage = await apiCreditService.getUsage(teamId, team?.plan)
    return response.ok({ data: usage })
  }
}
