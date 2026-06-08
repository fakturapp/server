import { BaseMail } from '@adonisjs/mail'
import { wrapHtml, ctaButton, detailRows, getFrontendUrl } from '#mails/helpers/email_template'

export class TeamAccessRestricted extends BaseMail {
  subject: string

  constructor(
    private email: string,
    private teamName: string,
    private name?: string
  ) {
    super()
    this.subject = `Votre accès à l'équipe ${this.teamName} est restreint`
  }

  prepare() {
    const url = `${getFrontendUrl()}/dashboard`

    const rows = [
      { label: '&Eacute;quipe', value: this.teamName },
      { label: 'Statut', value: 'Acc&egrave;s restreint' },
    ]

    const content = `
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; letter-spacing: -0.02em; margin: 0 0 8px; text-align: center;">Acc&egrave;s restreint</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #707070; margin: 0 0 24px; text-align: center;">
        ${this.name ? `Bonjour <span style="color: #5957e8; font-weight: 600;">${this.name}</span>,<br>` : ''}
        Le d&eacute;lai de 7 jours est &eacute;coul&eacute; et l&rsquo;&eacute;quipe <strong>${this.teamName}</strong> n&rsquo;a pas repris d&rsquo;abonnement.
      </p>
      ${detailRows(rows)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;"><tr>
        <td style="border-radius: 14px; padding: 16px 20px; font-size: 14px; line-height: 1.6; background: #fef2f2; color: #b91c1c;">
          Votre acc&egrave;s &agrave; cette &eacute;quipe est d&eacute;sormais restreint : vous ne pouvez plus y acc&eacute;der. D&egrave;s qu&rsquo;un abonnement sera repris, votre acc&egrave;s sera r&eacute;tabli automatiquement.
        </td>
      </tr></table>
      ${ctaButton(url, 'Acc&eacute;der &agrave; Faktur')}
    `

    const plainText = `Accès restreint\n\nBonjour${this.name ? ` ${this.name}` : ''},\n\nLe délai de 7 jours est écoulé et l'équipe ${this.teamName} n'a pas repris d'abonnement.\n\nVotre accès à cette équipe est désormais restreint : vous ne pouvez plus y accéder. Dès qu'un abonnement sera repris, votre accès sera rétabli automatiquement.\n\nAccéder à Faktur : ${url}`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
