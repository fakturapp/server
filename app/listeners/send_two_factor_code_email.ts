import mail from '@adonisjs/mail/services/main'
import TwoFactorCodeNotification from '#mails/two_factor_code_notification'
import type TwoFactorCodeRequested from '#events/two_factor_code_requested'

export default class SendTwoFactorCodeEmail {
  async handle(event: TwoFactorCodeRequested) {
    await mail.sendLater(new TwoFactorCodeNotification(event.email, event.code, event.name))
  }
}
