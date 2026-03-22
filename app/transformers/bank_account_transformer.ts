import type BankAccount from '#models/team/bank_account'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class BankAccountTransformer extends BaseTransformer<BankAccount> {
  toObject() {
    return this.pick(this.resource, ['id', 'label', 'bankName', 'isDefault', 'createdAt'])
  }
}
