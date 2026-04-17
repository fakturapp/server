import crypto from 'node:crypto'
import env from '#start/env'

const CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000

type VerificationResult =
  | { ok: true }
  | { ok: false; message: string }

class PaymentLinkCheckoutSessionService {
  private getKey(): Buffer {
    const raw =
      env.get('CHECKOUT_SESSION_KEY') || env.get('ENCRYPTION_KEY') || env.get('APP_KEY')
    const key = typeof raw === 'string' ? raw : raw.release()
    return crypto.createHash('sha256').update(key).digest()
  }

  issue(tokenHash: string): string {
    const payload = Buffer.from(
      JSON.stringify({
        tokenHash,
        exp: Date.now() + CHECKOUT_SESSION_TTL_MS,
      })
    ).toString('base64url')

    const signature = crypto
      .createHmac('sha256', this.getKey())
      .update(payload)
      .digest('base64url')

    return `${payload}.${signature}`
  }

  verify(sessionToken: string | null | undefined, expectedTokenHash: string): VerificationResult {
    if (!sessionToken) {
      return { ok: false, message: 'Session token required' }
    }

    const [payload, signature] = sessionToken.split('.')
    if (!payload || !signature) {
      return { ok: false, message: 'Invalid session token' }
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.getKey())
      .update(payload)
      .digest('base64url')

    try {
      if (
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
      ) {
        return { ok: false, message: 'Invalid session token' }
      }
    } catch {
      return { ok: false, message: 'Invalid session token' }
    }

    try {
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
        tokenHash?: string
        exp?: number
      }

      if (!data.exp || data.exp < Date.now()) {
        return { ok: false, message: 'Session expired' }
      }
      if (data.tokenHash !== expectedTokenHash) {
        return { ok: false, message: 'Session mismatch' }
      }

      return { ok: true }
    } catch {
      return { ok: false, message: 'Invalid session token' }
    }
  }
}

export default new PaymentLinkCheckoutSessionService()
