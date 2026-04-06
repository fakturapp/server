import { wrapHtml, ctaButton, infoBox, linkFallback } from '#mails/helpers/email_template'

export class PaymentLinkNotification {
  private paymentUrl: string
  private invoiceNumber: string
  private amount: number
  private currency: string
  private clientName: string

  constructor(
    _email: string,
    paymentUrl: string,
    invoiceNumber: string,
    amount: number,
    currency: string,
    clientName: string
  ) {
    this.paymentUrl = paymentUrl
    this.invoiceNumber = invoiceNumber
    this.amount = amount
    this.currency = currency
    this.clientName = clientName
  }

  getSubject(): string {
    return `Facture ${this.invoiceNumber} — Lien de paiement`
  }

  getHtml(): string {
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount)

    const content = `
      <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
        Paiement de votre facture
      </h2>
      <p style="margin: 0 0 24px; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
        Bonjour${this.clientName ? ` ${this.clientName}` : ''},
      </p>
      <p style="margin: 0 0 8px; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
        Vous avez re&ccedil;u une facture <strong style="color: #ffffff;">${this.invoiceNumber}</strong> d&rsquo;un montant de <strong style="color: #ffffff;">${formattedAmount}</strong>.
      </p>
      <p style="margin: 0 0 24px; font-size: 15px; color: #a1a1aa; line-height: 1.6;">
        Cliquez sur le bouton ci-dessous pour acc&eacute;der aux instructions de paiement.
      </p>
      ${ctaButton(this.paymentUrl, 'Payer la facture')}
      ${infoBox(
        'La facture est &eacute;galement jointe &agrave; cet email au format PDF.',
        'rgba(99,102,241,0.06)',
        'rgba(99,102,241,0.15)',
        '#a1a1aa'
      )}
      ${linkFallback(this.paymentUrl)}
    `

    return wrapHtml(content, this.getSubject())
  }

  getText(): string {
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount)

    return `Paiement de votre facture\n\nBonjour${this.clientName ? ` ${this.clientName}` : ''},\n\nVous avez reçu une facture ${this.invoiceNumber} d'un montant de ${formattedAmount}.\n\nAccédez aux instructions de paiement :\n${this.paymentUrl}\n\nLa facture est également jointe à cet email au format PDF.`
  }
}
