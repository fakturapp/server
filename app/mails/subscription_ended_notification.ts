import { BaseMail } from '@adonisjs/mail'
import { wrapHtml, ctaButton, detailRows, getFrontendUrl } from '#mails/helpers/email_template'

export class SubscriptionEndedNotification extends BaseMail {
  subject = 'Votre abonnement Faktur a pris fin'

  constructor(
    private email: string,
    private teamName: string,
    private name?: string
  ) {
    super()
  }

  prepare() {
    const url = `${getFrontendUrl()}/dashboard/settings/plan`

    const rows = [
      { label: '&Eacute;quipe', value: this.teamName },
      { label: 'Forfait actuel', value: 'Gratuit' },
    ]

    const content = `
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; letter-spacing: -0.02em; margin: 0 0 8px; text-align: center;">Abonnement termin&eacute;</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #707070; margin: 0 0 24px; text-align: center;">
        ${this.name ? `Bonjour <span style="color: #5957e8; font-weight: 600;">${this.name}</span>,<br>` : ''}
        L&rsquo;abonnement de l&rsquo;&eacute;quipe <strong>${this.teamName}</strong> a pris fin. Votre &eacute;quipe est repass&eacute;e au plan Gratuit.
      </p>
      ${detailRows(rows)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;"><tr>
        <td style="border-radius: 14px; padding: 16px 20px; font-size: 14px; line-height: 1.6; background: #f5f5f5; color: #171717;">
          Vos donn&eacute;es restent accessibles. Vous pouvez reprendre un forfait payant quand vous le souhaitez pour retrouver toutes les fonctionnalit&eacute;s.
        </td>
      </tr></table>
      ${ctaButton(url, 'Choisir un forfait')}
    `

    const plainText = `Abonnement terminé\n\nBonjour${this.name ? ` ${this.name}` : ''},\n\nL'abonnement de l'équipe ${this.teamName} a pris fin. Votre équipe est repassée au plan Gratuit.\n\nVos données restent accessibles. Vous pouvez reprendre un forfait payant quand vous le souhaitez.\n\nChoisir un forfait : ${url}`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
