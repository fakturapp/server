import { BaseMail } from '@adonisjs/mail'
import {
  wrapHtml,
  ctaButton,
  infoBox,
  linkFallback,
  getFrontendUrl,
} from '#mails/helpers/email_template'

const DOCUMENT_LABELS: Record<string, string> = {
  invoice: 'une facture',
  quote: 'un devis',
  credit_note: 'un avoir',
}

const ROUTES: Record<string, string> = {
  invoice: 'invoices',
  quote: 'quotes',
  credit_note: 'credit-notes',
}

export class DocumentShareNotification extends BaseMail {
  subject: string

  constructor(
    private email: string,
    private inviterName: string,
    private documentType: string,
    private documentId: string,
    private permission: 'viewer' | 'editor',
    private recipientHasAccount: boolean
  ) {
    super()
    const label = DOCUMENT_LABELS[this.documentType] ?? 'un document'
    this.subject = `${this.inviterName} partage ${label} avec vous sur Faktur`
  }

  prepare() {
    const label = DOCUMENT_LABELS[this.documentType] ?? 'un document'
    const route = ROUTES[this.documentType] ?? 'invoices'
    const url = `${getFrontendUrl()}/share/doc/${route}/${this.documentId}`
    const permissionText =
      this.permission === 'editor'
        ? 'Vous pouvez consulter et modifier ce document en temps r&eacute;el.'
        : 'Vous pouvez consulter ce document en lecture seule.'

    const content = `
      <h2 style="font-size: 20px; font-weight: 600; color: #171717; letter-spacing: -0.02em; margin: 0 0 8px; text-align: center;">Un document a &eacute;t&eacute; partag&eacute; avec vous</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #707070; margin: 0 0 4px; text-align: center;">
        <span style="color: #5957e8; font-weight: 600;">${this.inviterName}</span> vous a donn&eacute; acc&egrave;s &agrave; ${label} sur Faktur.<br>
        ${permissionText}
      </p>
      ${ctaButton(url, 'Ouvrir le document')}
      ${
        this.recipientHasAccount
          ? infoBox('Connectez-vous avec ce compte email pour acc&eacute;der au document.')
          : infoBox(
              "Vous n'avez pas encore de compte Faktur. Cr&eacute;ez-en un avec cette adresse email pour acc&eacute;der au document partag&eacute;."
            )
      }
      ${linkFallback(url)}
    `

    const plainText = `${this.inviterName} a partagé ${label} avec vous sur Faktur.\n\nOuvrir le document : ${url}`

    this.message.to(this.email)
    this.message.subject(this.subject)
    this.message.html(wrapHtml(content, this.subject))
    this.message.text(plainText)
  }
}
