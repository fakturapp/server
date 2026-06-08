import { BaseMail } from '@adonisjs/mail'
import {
  wrapHtml,
  brandBadge,
  ctaButton,
  detailRows,
  getFrontendUrl,
} from '#mails/helpers/email_template'

export class SubscriptionConfirmedNotification extends BaseMail {
  subject: string

  constructor(
    private email: string,
    private teamName: string,
    private planLabel: string,
    private periodLabel: string,
    private name?: string
  ) {
    super()
    this.subject = `Votre abonnement Faktur ${this.planLabel} est confirmé`
  }

  prepare() {
    const url = `${getFrontendUrl()}/dashboard/settings/plan`

    const rows = [
      { label: '&Eacute;quipe', value: this.teamName },
      { label: 'Forfait', value: `Faktur ${this.planLabel}` },
      { label: 'Facturation', value: this.periodLabel },
    ]

    const content = `
      ${brandBadge('Faktur', `${getFrontendUrl()}/logo.svg`)}
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; letter-spacing: -0.02em; margin: 0 0 8px; text-align: center;">Abonnement confirm&eacute;</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #707070; margin: 0 0 24px; text-align: center;">
        ${this.name ? `Bonjour <span style="color: #5957e8; font-weight: 600;">${this.name}</span>,<br>` : ''}
        Merci&nbsp;! Votre abonnement <strong>Faktur ${this.planLabel}</strong> est maintenant actif pour l&rsquo;&eacute;quipe <strong>${this.teamName}</strong>.
      </p>
      ${detailRows(rows)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;"><tr>
        <td style="border-radius: 14px; padding: 16px 20px; font-size: 14px; line-height: 1.6; background: #f0fdf4; color: #16a34a;">
          &#10003; Toutes les fonctionnalit&eacute;s de votre forfait sont d&eacute;sormais disponibles.
        </td>
      </tr></table>
      ${ctaButton(url, 'G&eacute;rer mon abonnement')}
    `

    const plainText = `Abonnement confirmé\n\nBonjour${this.name ? ` ${this.name}` : ''},\n\nMerci ! Votre abonnement Faktur ${this.planLabel} est maintenant actif pour l'équipe ${this.teamName}.\n\nFacturation : ${this.periodLabel}\n\nGérer mon abonnement : ${url}`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
