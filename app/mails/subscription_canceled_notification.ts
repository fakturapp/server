import { BaseMail } from '@adonisjs/mail'
import { wrapHtml, ctaButton, detailRows, getFrontendUrl } from '#mails/helpers/email_template'

export class SubscriptionCanceledNotification extends BaseMail {
  subject = 'Résiliation de votre abonnement programmée'

  constructor(
    private email: string,
    private teamName: string,
    private planLabel: string,
    private endDate: string,
    private name?: string
  ) {
    super()
  }

  prepare() {
    const url = `${getFrontendUrl()}/dashboard/settings/plan`

    const rows = [
      { label: '&Eacute;quipe', value: this.teamName },
      { label: 'Forfait actuel', value: `Faktur ${this.planLabel}` },
      { label: 'Fin de l&rsquo;abonnement', value: this.endDate },
    ]

    const content = `
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; letter-spacing: -0.02em; margin: 0 0 8px; text-align: center;">R&eacute;siliation programm&eacute;e</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #707070; margin: 0 0 24px; text-align: center;">
        ${this.name ? `Bonjour <span style="color: #5957e8; font-weight: 600;">${this.name}</span>,<br>` : ''}
        L&rsquo;abonnement de l&rsquo;&eacute;quipe <strong>${this.teamName}</strong> ne sera pas renouvel&eacute;.
      </p>
      ${detailRows(rows)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;"><tr>
        <td style="border-radius: 14px; padding: 16px 20px; font-size: 14px; line-height: 1.6; background: #f5f5f5; color: #171717;">
          Vous conservez l&rsquo;acc&egrave;s &agrave; toutes les fonctionnalit&eacute;s jusqu&rsquo;au <strong>${this.endDate}</strong>. Ensuite, votre &eacute;quipe repassera au plan Gratuit. Vous pouvez r&eacute;activer votre abonnement &agrave; tout moment.
        </td>
      </tr></table>
      ${ctaButton(url, 'G&eacute;rer mon abonnement')}
    `

    const plainText = `Résiliation programmée\n\nBonjour${this.name ? ` ${this.name}` : ''},\n\nL'abonnement de l'équipe ${this.teamName} ne sera pas renouvelé.\n\nVous conservez l'accès jusqu'au ${this.endDate}, puis votre équipe repassera au plan Gratuit. Vous pouvez réactiver votre abonnement à tout moment.\n\nGérer mon abonnement : ${url}`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
