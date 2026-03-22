import type EmailAccount from '#models/email/email_account'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class EmailAccountTransformer extends BaseTransformer<EmailAccount> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'provider',
      'email',
      'displayName',
      'isDefault',
      'isActive',
      'createdAt',
    ])
  }
}
