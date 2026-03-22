import type ClientContact from '#models/client/client_contact'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class ClientContactTransformer extends BaseTransformer<ClientContact> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'firstName',
      'lastName',
      'email',
      'phone',
      'role',
      'notes',
      'isPrimary',
      'includeInEmails',
      'createdAt',
    ])
  }
}
