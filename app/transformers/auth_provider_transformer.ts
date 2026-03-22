import type AuthProvider from '#models/account/auth_provider'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class AuthProviderTransformer extends BaseTransformer<AuthProvider> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'provider',
      'email',
      'displayName',
      'avatarUrl',
      'createdAt',
    ])
  }
}
