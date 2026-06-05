import EncryptionService from '#services/encryption/encryption_service'

const PENDING_TTL_MS = 10 * 60 * 1000

export function encodePending(userId: string): string {
  return EncryptionService.encrypt(JSON.stringify({ userId, ts: Date.now() }))
}

export function decodePending(token: string): string | null {
  try {
    const payload = JSON.parse(EncryptionService.decrypt(token)) as { userId?: string; ts?: number }
    if (!payload.userId || typeof payload.ts !== 'number') {
      return null
    }
    if (Date.now() - payload.ts > PENDING_TTL_MS) {
      return null
    }
    return payload.userId
  } catch {
    return null
  }
}
