import type { HttpContext } from '@adonisjs/core/http'
import SirenService from '#services/business/siren_service'

export default class CompanyLookup {
  async handle({ request, response }: HttpContext) {
    const digits = String(request.input('q', '')).replace(/\D/g, '')

    let result = null
    if (digits.length === 14) {
      result = await SirenService.searchBySiret(digits)
    } else if (digits.length === 9) {
      result = await SirenService.searchBySiren(digits)
    } else {
      return response.badRequest({
        message: 'Entrez un SIREN (9 chiffres) ou un SIRET (14 chiffres).',
      })
    }

    if (!result) {
      return response.notFound({ message: 'Entreprise introuvable.' })
    }

    return response.ok({ company: result })
  }
}
