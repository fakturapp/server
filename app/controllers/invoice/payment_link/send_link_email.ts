import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice/invoice'
import PaymentLink from '#models/invoice/payment_link'
import EmailAccount from '#models/email/email_account'
import EmailLog from '#models/email/email_log'
import { decryptModelFields, ENCRYPTED_FIELDS } from '#services/crypto/field_encryption_helper'
import encryptionService from '#services/encryption/encryption_service'
import env from '#start/env'
import { PaymentLinkNotification } from '#mails/payment_link_notification'
import GmailOAuthService from '#services/email/gmail_oauth_service'
import ResendUserService from '#services/email/resend_user_service'
import SmtpService from '#services/email/smtp_service'
import { DocumentPdfService } from '#services/pdf/document_pdf_service'

export default class SendLinkEmail {
  async handle(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const dek: Buffer = (ctx as any).dek
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const invoice = await Invoice.query()
      .where('id', params.invoiceId)
      .where('team_id', teamId)
      .preload('client')
      .first()

    if (!invoice) {
      return response.notFound({ message: 'Invoice not found' })
    }

    const paymentLink = await PaymentLink.query()
      .where('invoice_id', invoice.id)
      .where('team_id', teamId)
      .where('is_active', true)
      .first()

    if (!paymentLink) {
      return response.notFound({ message: 'No active payment link found' })
    }

    // Decrypt client to get email
    if (invoice.client) {
      decryptModelFields(invoice.client, [...ENCRYPTED_FIELDS.client], dek)
    }

    const clientEmail = invoice.client?.email
    if (!clientEmail) {
      return response.badRequest({ message: 'Client has no email address' })
    }

    // Get the team's default email account
    const emailAccount = await EmailAccount.query()
      .where('team_id', teamId)
      .where('is_default', true)
      .where('is_active', true)
      .first()

    if (!emailAccount) {
      return response.badRequest({ message: 'No email account configured' })
    }

    // Decrypt email account credentials
    decryptModelFields(emailAccount, ['accessToken', 'refreshToken', 'smtpHost', 'smtpUsername', 'smtpPassword'] as any, dek)

    // Build checkout URL
    const checkoutUrl = env.get('CHECKOUT_URL') || env.get('FRONTEND_URL') || 'http://localhost:3000'
    // We need the raw token -- but we only store the hash. We need to include the token in the URL.
    // The token was returned at creation time. Since we can't recover it, we use the tokenHash as the URL identifier.
    // Actually, the URL uses the raw token. Since we only have the hash, we need to store/pass the token differently.
    // For now, the frontend should pass the token from when it was created.
    const token = request.input('token')
    if (!token) {
      return response.badRequest({ message: 'Token is required to build the payment link URL' })
    }

    const paymentUrl = `${checkoutUrl}/checkout/${token}/pay`

    // Generate PDF
    let pdfBuffer: Buffer | null = null
    let pdfFilename = `${invoice.invoiceNumber}.pdf`
    try {
      const pdfService = new DocumentPdfService()
      const result = await pdfService.generateInvoicePdf(invoice.id, teamId, dek)
      pdfBuffer = result.buffer
      pdfFilename = result.filename || pdfFilename
    } catch {
      // PDF generation failure should not block email
    }

    // Build email content
    const clientName = invoice.client?.displayName || 'Client'
    const notification = new PaymentLinkNotification(
      clientEmail,
      paymentUrl,
      invoice.invoiceNumber,
      Number(invoice.total),
      paymentLink.currency,
      clientName
    )

    // Send email via the configured provider
    let emailStatus: 'sent' | 'error' = 'sent'
    let errorMessage: string | null = null

    try {
      if (emailAccount.provider === 'gmail') {
        const gmailService = new GmailOAuthService()
        await gmailService.sendMail(
          emailAccount,
          clientEmail,
          notification.getSubject(),
          notification.getHtml(),
          notification.getText(),
          pdfBuffer ? [{ filename: pdfFilename, content: pdfBuffer }] : []
        )
      } else if (emailAccount.provider === 'resend') {
        const resendService = new ResendUserService()
        await resendService.sendMail(
          emailAccount,
          clientEmail,
          notification.getSubject(),
          notification.getHtml(),
          notification.getText(),
          pdfBuffer ? [{ filename: pdfFilename, content: pdfBuffer }] : []
        )
      } else if (emailAccount.provider === 'smtp') {
        const smtpService = new SmtpService()
        await smtpService.sendMail(
          emailAccount,
          clientEmail,
          notification.getSubject(),
          notification.getHtml(),
          notification.getText(),
          pdfBuffer ? [{ filename: pdfFilename, content: pdfBuffer }] : []
        )
      }
    } catch (err: any) {
      emailStatus = 'error'
      errorMessage = err.message || 'Unknown error'
    }

    // Log email
    const logData: Record<string, any> = {
      teamId,
      emailAccountId: emailAccount.id,
      documentType: 'invoice',
      documentId: invoice.id,
      documentNumber: invoice.invoiceNumber,
      fromEmail: emailAccount.email,
      toEmail: clientEmail,
      subject: notification.getSubject(),
      body: notification.getHtml(),
      status: emailStatus,
      errorMessage,
      emailType: 'payment_link',
    }

    // Encrypt email log fields
    const { encryptModelFields: encryptFields } = await import('#services/crypto/field_encryption_helper')
    encryptFields(logData, [...ENCRYPTED_FIELDS.emailLog], dek)

    await EmailLog.create(logData)

    if (emailStatus === 'error') {
      return response.internalServerError({ message: 'Failed to send email', error: errorMessage })
    }

    return response.ok({ message: 'Payment link email sent' })
  }
}
