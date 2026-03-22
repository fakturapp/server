import mail from '@adonisjs/mail/services/main'
import SecurityCodeNotification from '#mails/security_code_notification'
import type EmailChangeRequested from '#events/email_change_requested'

export default class SendEmailChangeCode {
  async handle(event: EmailChangeRequested) {
    await mail.send(new SecurityCodeNotification(event.email, event.code, event.name))
  }
}
