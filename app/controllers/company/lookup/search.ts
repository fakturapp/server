import type { HttpContext } from '@adonisjs/core/http'
import SirenService from '#services/business/siren_service'

export default class CompanyLookup {
  async handle({ request, response }: HttpContext) {
    const query = String(request.input('q', ''))
    const results = await SirenService.search(query)

    return response.ok({
      results: results.map((result) => ({
        ...result,
        companyName: result.legalName,
        address: result.addressLine1,
      })),
    })
  }
}
