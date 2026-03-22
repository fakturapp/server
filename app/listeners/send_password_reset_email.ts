import mail from '@adonisjs/mail/services/main'
import PasswordResetNotification from '#mails/password_reset_notification'
import type PasswordResetRequested from '#events/password_reset_requested'

export default class SendPasswordResetEmail {
  async handle(event: PasswordResetRequested) {
    await mail.sendLater(
      new PasswordResetNotification(event.email, event.token, event.name)
    )
  }
}
