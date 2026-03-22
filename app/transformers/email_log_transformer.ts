import type EmailLog from '#models/email/email_log'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class EmailLogTransformer extends BaseTransformer<EmailLog> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'documentType',
      'documentId',
      'emailType',
      'status',
      'fromEmail',
      'toEmail',
      'subject',
      'errorMessage',
      'createdAt',
    ])
  }
}
