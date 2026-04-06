import { BaseMail } from '@adonisjs/mail'
import { wrapHtml, ctaButton, infoBox } from '#mails/helpers/email_template'

export class StripePaymentToCreator extends BaseMail {
  subject: string

  constructor(
    private email: string,
    private invoiceNumber: string,
    private amount: number,
    private currency: string,
    private invoiceUrl: string
  ) {
    super()
    this.subject = `Paiement Stripe reçu — Facture ${this.invoiceNumber}`
  }

  prepare() {
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount)

    const content = `
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
        Paiement re&ccedil;u par Stripe
      </h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
        Un paiement par carte bancaire de <strong style="color: #ffffff;">${formattedAmount}</strong> a &eacute;t&eacute; re&ccedil;u pour la facture <strong style="color: #ffffff;">${this.invoiceNumber}</strong>.
      </p>
      ${infoBox(
        '&#10003; Ce paiement a &eacute;t&eacute; <strong>automatiquement confirm&eacute;</strong> par Stripe. La facture a &eacute;t&eacute; marqu&eacute;e comme pay&eacute;e. Aucune action n&eacute;cessaire de votre part.',
        'rgba(34,197,94,0.08)',
        'rgba(34,197,94,0.2)',
        '#4ade80'
      )}
      ${ctaButton(this.invoiceUrl, 'Voir la facture')}
    `

    const plainText = `Paiement Stripe reçu\n\nUn paiement par carte bancaire de ${formattedAmount} a été reçu pour la facture ${this.invoiceNumber}.\n\nCe paiement a été automatiquement confirmé par Stripe. La facture a été marquée comme payée.\n\n${this.invoiceUrl}`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
