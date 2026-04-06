import { BaseMail } from '@adonisjs/mail'
import { wrapHtml, infoBox } from '#mails/helpers/email_template'

export class StripePaymentToClient extends BaseMail {
  subject: string

  constructor(
    private email: string,
    private invoiceNumber: string,
    private clientName?: string
  ) {
    super()
    this.subject = `Paiement confirmé — Facture ${this.invoiceNumber}`
  }

  prepare() {
    const content = `
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
        Paiement confirm&eacute;
      </h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
        Bonjour${this.clientName ? ` ${this.clientName}` : ''},
      </p>
      <p style="margin: 0 0 24px; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
        Votre paiement par carte bancaire pour la facture <strong style="color: #ffffff;">${this.invoiceNumber}</strong> a &eacute;t&eacute; trait&eacute; avec succ&egrave;s.
      </p>
      ${infoBox(
        '&#10003; Tout est en ordre. Aucune action suppl&eacute;mentaire n&rsquo;est n&eacute;cessaire.',
        'rgba(34,197,94,0.08)',
        'rgba(34,197,94,0.2)',
        '#4ade80'
      )}
    `

    const plainText = `Paiement confirmé\n\nBonjour${this.clientName ? ` ${this.clientName}` : ''},\n\nVotre paiement par carte bancaire pour la facture ${this.invoiceNumber} a été traité avec succès.\n\nTout est en ordre.`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
