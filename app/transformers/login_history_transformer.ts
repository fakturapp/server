import type LoginHistory from '#models/account/login_history'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class LoginHistoryTransformer extends BaseTransformer<LoginHistory> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'status',
      'ipAddress',
      'userAgent',
      'country',
      'city',
      'failureReason',
      'isSuspicious',
      'createdAt',
    ])
  }
}
