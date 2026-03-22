import type PaymentReminder from '#models/reminder/payment_reminder'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PaymentReminderTransformer extends BaseTransformer<PaymentReminder> {
  toObject() {
    return this.pick(this.resource, ['id', 'type', 'status', 'toEmail', 'errorMessage', 'sentAt'])
  }
}
