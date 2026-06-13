import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import env from '#start/env'
import WebLoginToken from '#models/account/web_login_token'
import oauthCrypto from '#services/oauth/oauth_crypto_service'

const TTL_SECONDS = 45

export default class CreateWebLoginToken {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!

    const code = oauthCrypto.generateToken(32)
    const codeHash = oauthCrypto.hash(code)
    const expiresAt = DateTime.now().plus({ seconds: TTL_SECONDS })

    await WebLoginToken.create({
      userId: user.id,
      codeHash,
      purpose: 'web-autologin',
      expiresAt,
      ipAddress: request.ip(),
    })

    const accountUrl = env.get('ACCOUNT_URL') || env.get('FRONTEND_URL') || 'http://localhost:3000'
    const url = `${accountUrl.replace(/\/$/, '')}/auto-login?code=${code}`

    response.header('Cache-Control', 'no-store')
    return response.ok({ url, expiresAt: expiresAt.toISO() })
  }
}
