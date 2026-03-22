import mail from '@adonisjs/mail/services/main'
import TwoFactorEnabledNotification from '#mails/two_factor_enabled_notification'
import type TwoFactorEnabled from '#events/two_factor_enabled'

export default class SendTwoFactorEnabledEmail {
  async handle(event: TwoFactorEnabled) {
    await mail.sendLater(
      new TwoFactorEnabledNotification(event.email, event.name)
    )
  }
}
