import { BaseMail } from '@adonisjs/mail'
import { infoBox, wrapHtml } from './helpers/email_template.js'

export default class AccountDeletedNotification extends BaseMail {
  subject = 'Compte supprimé - Faktur'

  constructor(
    email: string,
    private name?: string
  ) {
    super()
    this.message.to(email)
  }

  prepare() {
    const content = `
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; line-height: 1.3; text-align: center;">Compte supprim&eacute;</h1>
      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.7; color: #a1a1aa; text-align: center;">
        Bonjour${this.name ? ` <span style="color: #c7d2fe; font-weight: 500;">${this.name}</span>` : ''},<br><br>
        Votre compte Faktur a &eacute;t&eacute; supprim&eacute; d&eacute;finitivement conform&eacute;ment &agrave; votre demande. Toutes vos donn&eacute;es ont &eacute;t&eacute; effac&eacute;es.
      </p>
      ${infoBox("Si vous n'&ecirc;tes pas &agrave; l'origine de cette suppression, contactez le support imm&eacute;diatement.", 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.15)', '#f87171')}
      <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.7; color: #71717a; text-align: center;">
        Merci d'avoir utilis&eacute; Faktur. Vous pouvez recr&eacute;er un compte &agrave; tout moment.
      </p>
    `

    this.message.html(wrapHtml(content, 'Compte supprimé'))
    this.message.text(
      'Votre compte Faktur a été supprimé définitivement. Toutes vos données ont été effacées.'
    )
  }
}
