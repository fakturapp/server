import type { HttpContext } from '@adonisjs/core/http'
import Company from '#models/team/company'

export default class CompanyDelete {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!
    if (!user.currentTeamId) {
      return response.notFound({ message: 'No team found' })
    }

    const company = await Company.findBy('teamId', user.currentTeamId)
    if (company) {
      await company.delete()
    }

    return response.ok({ message: 'Informations supprimées' })
  }
}
