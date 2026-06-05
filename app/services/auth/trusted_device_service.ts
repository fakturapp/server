import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import TrustedDevice from '#models/account/trusted_device'
import User from '#models/account/user'
import { realClientIp } from '#services/http/real_client_ip'

const TRUSTED_DEVICE_TTL_DAYS = 30

export default class TrustedDeviceService {
  static issueToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  static hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  static async create(user: User, rawToken: string, ctx: HttpContext): Promise<TrustedDevice> {
    const clientIp = realClientIp(ctx)
    const userAgent = ctx.request.header('user-agent') ?? null

    return TrustedDevice.create({
      userId: user.id,
      tokenHash: TrustedDeviceService.hash(rawToken),
      deviceLabel: userAgent ? userAgent.slice(0, 255) : null,
      ipAddress: clientIp,
      userAgent: userAgent ? userAgent.slice(0, 512) : null,
      lastUsedAt: DateTime.now(),
      expiresAt: DateTime.now().plus({ days: TRUSTED_DEVICE_TTL_DAYS }),
    })
  }

  static async verify(userId: string, rawToken: string): Promise<boolean> {
    if (!rawToken) {
      return false
    }

    const tokenHash = TrustedDeviceService.hash(rawToken)
    const device = await TrustedDevice.query()
      .where('userId', userId)
      .where('tokenHash', tokenHash)
      .where('expiresAt', '>', DateTime.now().toSQL()!)
      .first()

    if (!device) {
      return false
    }

    device.lastUsedAt = DateTime.now()
    await device.save()

    return true
  }
}
