import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import VerifyEmailNotification from '#mails/verify_email_notification'
import type UserRegistered from '#events/user_registered'

export default class SendVerificationEmail {
  async handle(event: UserRegistered) {
    try {
      await mail.send(new VerifyEmailNotification(event.email, event.token, event.name))
    } catch (error) {
      logger.error({ err: error, email: event.email }, 'verification email failed')
    }
  }
}
