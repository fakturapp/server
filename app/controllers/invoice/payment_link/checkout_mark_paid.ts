import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import PaymentLink from '#models/invoice/payment_link'
import Invoice from '#models/invoice/invoice'
import User from '#models/account/user'
import encryptionService from '#services/encryption/encryption_service'
import { broadcastDocumentSaved, notifyUser } from '#services/collaboration/websocket_service'
import { PaymentMarkedToCreator } from '#mails/payment_marked_to_creator'
import { PaymentMarkedToClient } from '#mails/payment_marked_to_client'
import pushService from '#services/push/push_service'
import { formatPushAmount } from '#services/push/push_formatters'
import mail from '@adonisjs/mail/services/main'

export default class CheckoutMarkPaid {
  async handle({ params, response }: HttpContext) {
    response.header('X-Robots-Tag', 'noindex, nofollow')
    response.header('Cache-Control', 'no-store, no-cache, must-revalidate')

    const tokenHash = encryptionService.hash(params.token)

    const paymentLink = await PaymentLink.query()
      .where('token_hash', tokenHash)
      .where('is_active', true)
      .first()

    if (!paymentLink || paymentLink.isExpired) {
      return response.notFound({ message: 'Payment link not found or expired' })
    }

    if (paymentLink.paidAt) {
      return response.conflict({ message: 'Payment already marked as sent' })
    }

    paymentLink.paidAt = DateTime.now()
    await paymentLink.save()

    const invoice = await Invoice.find(paymentLink.invoiceId)
    if (invoice) {
      invoice.status = 'paid_unconfirmed'
      await invoice.save()

      broadcastDocumentSaved('invoice', invoice.id, 'system')
    }

    // Push « paiement à confirmer » au créateur de la facture (action phare
    // de l'app mobile : il pourra confirmer directement depuis la notification).
    const amountLabel = formatPushAmount(paymentLink.amount, paymentLink.currency)
    await pushService.notifyUser(paymentLink.createdByUserId, 'payment.to_confirm', {
      title: 'Paiement à confirmer',
      body: `${paymentLink.invoiceNumber} · ${amountLabel} — votre client a signalé un paiement`,
      category: 'PAYMENT_TO_CONFIRM',
      threadId: paymentLink.invoiceId,
      interruptionLevel: 'time-sensitive',
      relevanceScore: 1,
      data: {
        invoiceId: paymentLink.invoiceId,
        deepLink: `faktur://invoice/${paymentLink.invoiceId}`,
      },
    })

    notifyUser(paymentLink.createdByUserId, 'payment.to_confirm', {
      invoiceId: paymentLink.invoiceId,
      invoiceNumber: paymentLink.invoiceNumber,
      amount: Number(paymentLink.amount) || 0,
      currency: paymentLink.currency,
    })

    try {
      const creator = await User.find(paymentLink.createdByUserId)
      if (creator?.email) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
        const invoiceUrl = `${frontendUrl}/dashboard/invoices?open=${paymentLink.invoiceId}`

        await mail.send(
          new PaymentMarkedToCreator(
            creator.email,
            paymentLink.invoiceNumber,
            paymentLink.amount,
            paymentLink.currency,
            invoiceUrl
          )
        )
      }
    } catch {
      // Email failure should not block the payment
    }

    // Send confirmation email to Abel (client)
    // clientEmail is app-level encrypted, decrypt it here
    if (paymentLink.clientEmail) {
      try {
        const clientEmail = encryptionService.decrypt(paymentLink.clientEmail)
        let clientName: string | undefined
        if (paymentLink.clientName) {
          try {
            clientName = encryptionService.decrypt(paymentLink.clientName)
          } catch {
            // ignore
          }
        }
        await mail.send(
          new PaymentMarkedToClient(clientEmail, paymentLink.invoiceNumber, clientName)
        )
      } catch {
        // Email failure should not block
      }
    }

    return response.ok({
      message: 'Payment marked as sent. Awaiting confirmation.',
    })
  }
}
