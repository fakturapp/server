import type Company from '#models/team/company'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class CompanyTransformer extends BaseTransformer<Company> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'legalName',
      'tradeName',
      'legalForm',
      'siren',
      'siret',
      'vatNumber',
      'addressLine1',
      'addressLine2',
      'postalCode',
      'city',
      'country',
      'phone',
      'email',
      'website',
      'logoUrl',
      'paymentConditions',
      'currency',
      'createdAt',
    ])
  }
}
