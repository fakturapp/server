import encryptionService from '#services/encryption/encryption_service'

export function signCheckoutSession(tokenHash: string): string {
  const payload = Buffer.from(
    JSON.stringify({ tokenHash, exp: Date.now() + 30 * 60 * 1000 })
  ).toString('base64url')

  return `${payload}.${encryptionService.hmac(payload)}`
}

export function verifyCheckoutSession(
  sessionToken: string | undefined,
  tokenHash: string
): boolean {
  if (!sessionToken) {
    return false
  }

  const [payload, signature] = sessionToken.split('.')

  if (!payload || !signature) {
    return false
  }

  try {
    if (!encryptionService.timingSafeEqual(signature, encryptionService.hmac(payload))) {
      return false
    }

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())

    return data.exp >= Date.now() && data.tokenHash === tokenHash
  } catch {
    return false
  }
}
