import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import env from '#start/env'
import WebLoginToken from '#models/account/web_login_token'
import oauthCrypto from '#services/oauth/oauth_crypto_service'

const TTL_SECONDS = 45

/**
 * POST /v1/account/web-login-token
 *
 * Génère un code à usage unique (TTL 45 s) et renvoie l'URL d'auto-login
 * du site `account`. Seul le hash du code est stocké ; le code clair ne
 * vit que dans l'URL remise à l'app, jamais en base ni en logs.
 */
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
