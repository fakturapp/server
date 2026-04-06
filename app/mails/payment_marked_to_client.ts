import { BaseMail } from '@adonisjs/mail'
import { wrapHtml, infoBox } from '#mails/helpers/email_template'

export class PaymentMarkedToClient extends BaseMail {
  subject: string

  constructor(
    private email: string,
    private invoiceNumber: string,
    private clientName?: string
  ) {
    super()
    this.subject = `Paiement envoyé — Facture ${this.invoiceNumber}`
  }

  prepare() {
    const content = `
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
        Paiement envoy&eacute;
      </h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
        Bonjour${this.clientName ? ` ${this.clientName}` : ''},
      </p>
      <p style="margin: 0 0 24px; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
        Votre paiement pour la facture <strong style="color: #ffffff;">${this.invoiceNumber}</strong> a bien &eacute;t&eacute; signal&eacute;.
      </p>
      ${infoBox(
        'Votre paiement est en attente de confirmation par le destinataire. Vous recevrez un email d&egrave;s que le paiement sera confirm&eacute;.',
        'rgba(99,102,241,0.06)',
        'rgba(99,102,241,0.15)',
        '#a1a1aa'
      )}
    `

    const plainText = `Paiement envoyé\n\nBonjour${this.clientName ? ` ${this.clientName}` : ''},\n\nVotre paiement pour la facture ${this.invoiceNumber} a bien été signalé.\n\nVotre paiement est en attente de confirmation par le destinataire. Vous recevrez un email dès que le paiement sera confirmé.`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
