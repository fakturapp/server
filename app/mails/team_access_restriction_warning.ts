import { BaseMail } from '@adonisjs/mail'
import { wrapHtml, ctaButton, detailRows, getFrontendUrl } from '#mails/helpers/email_template'

export class TeamAccessRestrictionWarning extends BaseMail {
  subject: string

  constructor(
    private email: string,
    private teamName: string,
    private graceDate: string,
    private name?: string
  ) {
    super()
    this.subject = `Votre accès à l'équipe ${this.teamName} va être restreint`
  }

  prepare() {
    const url = `${getFrontendUrl()}/dashboard`

    const rows = [
      { label: '&Eacute;quipe', value: this.teamName },
      { label: 'Acc&egrave;s maintenu jusqu&rsquo;au', value: this.graceDate },
    ]

    const content = `
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; letter-spacing: -0.02em; margin: 0 0 8px; text-align: center;">Acc&egrave;s bient&ocirc;t restreint</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #707070; margin: 0 0 24px; text-align: center;">
        ${this.name ? `Bonjour <span style="color: #5957e8; font-weight: 600;">${this.name}</span>,<br>` : ''}
        Suite &agrave; la r&eacute;siliation de l&rsquo;abonnement de l&rsquo;&eacute;quipe <strong>${this.teamName}</strong>, votre acc&egrave;s en tant que membre va &ecirc;tre restreint.
      </p>
      ${detailRows(rows)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0;"><tr>
        <td style="border-radius: 14px; padding: 16px 20px; font-size: 14px; line-height: 1.6; background: #fffbeb; color: #b45309;">
          Vous conservez votre acc&egrave;s jusqu&rsquo;au <strong>${this.graceDate}</strong> (7 jours). Pour le conserver, l&rsquo;&eacute;quipe doit reprendre un abonnement avant cette date. Pass&eacute; ce d&eacute;lai, vous ne pourrez plus acc&eacute;der &agrave; l&rsquo;&eacute;quipe.
        </td>
      </tr></table>
      ${ctaButton(url, 'Acc&eacute;der &agrave; Faktur')}
    `

    const plainText = `Accès bientôt restreint\n\nBonjour${this.name ? ` ${this.name}` : ''},\n\nSuite à la résiliation de l'abonnement de l'équipe ${this.teamName}, votre accès en tant que membre va être restreint.\n\nVous conservez votre accès jusqu'au ${this.graceDate} (7 jours). Pour le conserver, l'équipe doit reprendre un abonnement avant cette date. Passé ce délai, vous ne pourrez plus accéder à l'équipe.\n\nAccéder à Faktur : ${url}`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
