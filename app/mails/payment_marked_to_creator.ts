import { BaseMail } from '@adonisjs/mail'
import { wrapHtml, ctaButton, infoBox } from '#mails/helpers/email_template'

export class PaymentMarkedToCreator extends BaseMail {
  subject: string

  constructor(
    private email: string,
    private invoiceNumber: string,
    private amount: number,
    private currency: string,
    private invoiceUrl: string
  ) {
    super()
    this.subject = `Paiement reçu — Facture ${this.invoiceNumber}`
  }

  prepare() {
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount)

    const content = `
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
        Paiement signal&eacute;
      </h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
        Votre client a indiqu&eacute; avoir effectu&eacute; le paiement de la facture <strong style="color: #ffffff;">${this.invoiceNumber}</strong> d&rsquo;un montant de <strong style="color: #ffffff;">${formattedAmount}</strong>.
      </p>
      ${infoBox(
        '&#9888;&#65039; Ce paiement n&rsquo;est pas encore confirm&eacute;. V&eacute;rifiez la r&eacute;ception sur votre compte bancaire puis confirmez le paiement.',
        'rgba(245,158,11,0.08)',
        'rgba(245,158,11,0.2)',
        '#fbbf24'
      )}
      ${ctaButton(this.invoiceUrl, 'Voir la facture et confirmer')}
    `

    const plainText = `Paiement signalé\n\nVotre client a indiqué avoir effectué le paiement de la facture ${this.invoiceNumber} d'un montant de ${formattedAmount}.\n\nVérifiez la réception sur votre compte bancaire puis confirmez le paiement :\n${this.invoiceUrl}`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
