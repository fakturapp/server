import type { HttpContext } from '@adonisjs/core/http'
import PaymentLink from '#models/invoice/payment_link'
import encryptionService from '#services/encryption/encryption_service'
import paymentLinkCheckoutSessionService from '#services/invoice/payment_link_checkout_session_service'

export default class CheckoutGetIban {
  async handle({ params, request, response }: HttpContext) {
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
      return response.forbidden({ message: 'Payment already marked as sent, IBAN is no longer accessible' })
    }

    if (!paymentLink.showIban) {
      return response.forbidden({ message: 'IBAN display is disabled for this link' })
    }

    if (paymentLink.passwordHash) {
      const verification = paymentLinkCheckoutSessionService.verify(
        request.header('X-Checkout-Session'),
        tokenHash
      )
      if (!verification.ok) {
        return response.unauthorized({ message: verification.message })
      }
    }

    let iban: string | null = null
    let bic: string | null = null
    let bankName: string | null = null

    try {
      if (paymentLink.encryptedIban) {
        iban = encryptionService.decrypt(paymentLink.encryptedIban)
      }
      if (paymentLink.encryptedBic) {
        bic = encryptionService.decrypt(paymentLink.encryptedBic)
      }
      if (paymentLink.encryptedBankName) {
        const raw = encryptionService.decrypt(paymentLink.encryptedBankName)
        try {
          bankName = Buffer.from(raw, 'latin1').toString('utf8')
          if (bankName.includes('\ufffd')) bankName = raw
        } catch {
          bankName = raw
        }
      }
    } catch {
      return response.internalServerError({ message: 'Failed to decrypt payment information' })
    }

    const formattedIban = iban ? iban.replace(/(.{4})/g, '$1 ').trim() : null

    response.header('Content-Type', 'application/json; charset=utf-8')
    return response.ok({
      iban: formattedIban,
      ibanRaw: iban,
      bic,
      bankName,
    })
  }
}
