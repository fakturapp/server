import mail from '@adonisjs/mail/services/main'
import VerifyEmailNotification from '#mails/verify_email_notification'
import type UserRegistered from '#events/user_registered'

export default class SendVerificationEmail {
  async handle(event: UserRegistered) {
    await mail.sendLater(
      new VerifyEmailNotification(event.email, event.token, event.name)
    )
  }
}
