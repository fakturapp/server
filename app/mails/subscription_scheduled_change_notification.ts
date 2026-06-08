import { BaseMail } from '@adonisjs/mail'
import { wrapHtml, ctaButton, detailRows, getFrontendUrl } from '#mails/helpers/email_template'

export class SubscriptionScheduledChangeNotification extends BaseMail {
  subject = 'Changement de forfait programmé'

  constructor(
    private email: string,
    private teamName: string,
    private fromPlanLabel: string,
    private toPlanLabel: string,
    private periodLabel: string,
    private effectiveDate: string,
    private name?: string
  ) {
    super()
  }

  prepare() {
    const url = `${getFrontendUrl()}/dashboard/settings/plan`

    const rows = [
      { label: '&Eacute;quipe', value: this.teamName },
      { label: 'Forfait actuel', value: `Faktur ${this.fromPlanLabel}` },
      { label: 'Nouveau forfait', value: `Faktur ${this.toPlanLabel} (${this.periodLabel})` },
      { label: 'Date d&rsquo;effet', value: this.effectiveDate },
    ]

    const content = `
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; letter-spacing: -0.02em; margin: 0 0 8px; text-align: center;">Changement programm&eacute;</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #707070; margin: 0 0 24px; text-align: center;">
        ${this.name ? `Bonjour <span style="color: #5957e8; font-weight: 600;">${this.name}</span>,<br>` : ''}
        Le forfait de l&rsquo;&eacute;quipe <strong>${this.teamName}</strong> va changer &agrave; la fin de la p&eacute;riode en cours.
      </p>
      ${detailRows(rows)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;"><tr>
        <td style="border-radius: 14px; padding: 16px 20px; font-size: 14px; line-height: 1.6; background: #f5f5f5; color: #171717;">
          Vous conservez <strong>Faktur ${this.fromPlanLabel}</strong> jusqu&rsquo;au <strong>${this.effectiveDate}</strong>, puis vous passerez &agrave; <strong>Faktur ${this.toPlanLabel}</strong>. Vous pouvez annuler ce changement &agrave; tout moment.
        </td>
      </tr></table>
      ${ctaButton(url, 'G&eacute;rer mon abonnement')}
    `

    const plainText = `Changement de forfait programmé\n\nBonjour${this.name ? ` ${this.name}` : ''},\n\nLe forfait de l'équipe ${this.teamName} va changer.\n\nVous conservez Faktur ${this.fromPlanLabel} jusqu'au ${this.effectiveDate}, puis vous passerez à Faktur ${this.toPlanLabel} (${this.periodLabel}). Vous pouvez annuler ce changement à tout moment.\n\nGérer mon abonnement : ${url}`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
