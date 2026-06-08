import { BaseMail } from '@adonisjs/mail'
import { wrapHtml, ctaButton, detailRows, getFrontendUrl } from '#mails/helpers/email_template'

export class PaymentRecoveredNotification extends BaseMail {
  subject = 'Paiement reçu, votre abonnement est réactivé'

  constructor(
    private email: string,
    private teamName: string,
    private planLabel: string,
    private name?: string
  ) {
    super()
  }

  prepare() {
    const url = `${getFrontendUrl()}/dashboard/settings/plan`

    const rows = [
      { label: '&Eacute;quipe', value: this.teamName },
      { label: 'Forfait', value: `Faktur ${this.planLabel}` },
    ]

    const content = `
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; letter-spacing: -0.02em; margin: 0 0 8px; text-align: center;">Paiement re&ccedil;u</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #707070; margin: 0 0 24px; text-align: center;">
        ${this.name ? `Bonjour <span style="color: #5957e8; font-weight: 600;">${this.name}</span>,<br>` : ''}
        Bonne nouvelle&nbsp;! Le paiement de l&rsquo;abonnement de l&rsquo;&eacute;quipe <strong>${this.teamName}</strong> a bien &eacute;t&eacute; re&ccedil;u.
      </p>
      ${detailRows(rows)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;"><tr>
        <td style="border-radius: 14px; padding: 16px 20px; font-size: 14px; line-height: 1.6; background: #f0fdf4; color: #16a34a;">
          &#10003; Votre abonnement est de nouveau actif. Aucune action suppl&eacute;mentaire n&rsquo;est requise.
        </td>
      </tr></table>
      ${ctaButton(url, 'Voir mon abonnement')}
    `

    const plainText = `Paiement reçu\n\nBonjour${this.name ? ` ${this.name}` : ''},\n\nBonne nouvelle ! Le paiement de l'abonnement de l'équipe ${this.teamName} a bien été reçu. Votre abonnement est de nouveau actif.\n\nVoir mon abonnement : ${url}`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
