import mail from '@adonisjs/mail/services/main'
import SecurityCodeNotification from '#mails/security_code_notification'
import type SecurityCodeRequested from '#events/security_code_requested'

export default class SendSecurityCodeEmail {
  async handle(event: SecurityCodeRequested) {
    await mail.sendLater(new SecurityCodeNotification(event.email, event.code, event.name))
  }
}
