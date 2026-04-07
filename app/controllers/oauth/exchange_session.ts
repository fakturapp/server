import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import User from '#models/account/user'
import oauthTokenService from '#services/oauth/oauth_token_service'
import keyStore from '#services/crypto/key_store'
import encryptionService from '#services/encryption/encryption_service'
import UserTransformer from '#transformers/user_transformer'

/**
 * POST /api/v1/oauth/exchange-session
 *
 * Trades a valid OAuth access_token for a regular dashboard session
 * access token (@adonisjs/auth). Used by the desktop client right
 * after the OAuth dance so the embedded dashboard window can boot
 * with `localStorage.faktur_token = <session_token>` set, skipping
 * the email/password login flow entirely.
 *
 * Security: the OAuth token must be presented in the Authorization
 * header and must be active. The desktop uses its own refresh token
 * to rotate OAuth access tokens, then calls this endpoint again
 * whenever the dashboard session expires.
 */
export default class ExchangeSession {
  async handle({ request, response }: HttpContext) {
    const authHeader = request.header('authorization') || ''
    const match = authHeader.match(/^Bearer (.+)$/i)
    if (!match) {
      return response.unauthorized({
        error: 'invalid_request',
        error_description: 'Missing Authorization: Bearer <access_token> header',
      })
    }
    const rawAccessToken = match[1]

    const oauthToken = await oauthTokenService.findActiveByAccessToken(rawAccessToken)
    if (!oauthToken) {
      return response.unauthorized({
        error: 'invalid_token',
        error_description: 'OAuth access token is invalid, expired or revoked',
      })
    }

    if (!oauthToken.scopes.includes('profile')) {
      return response.forbidden({
        error: 'insufficient_scope',
        error_description: "The 'profile' scope is required to exchange for a session",
      })
    }

    const user = await User.find(oauthToken.userId)
    if (!user || user.status !== 'active') {
      return response.unauthorized({
        error: 'invalid_token',
        error_description: 'User not found or inactive',
      })
    }

    // Touch the OAuth token so the admin UI 'last used' reflects this.
    await oauthTokenService.touch(oauthToken, request.ip(), request.header('user-agent') ?? null)

    // Mint a short-lived dashboard session token (1 day). The desktop
    // will call this endpoint again when the dashboard session expires
    // since it still holds a valid OAuth refresh token.
    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: '1 day',
    })

    await db
      .from('auth_access_tokens')
      .where('id', String(token.identifier))
      .update({
        ip_address: request.ip(),
        user_agent: (request.header('user-agent') || '').slice(0, 512),
      })

    user.lastLoginAt = DateTime.now()
    await user.save()

    // Vault key handling — we can't derive a KEK from a password here
    // because we don't have one. If the user happens to have a live
    // KEK in the in-memory key store (from a concurrent browser
    // session that's still warm), we re-wrap it with a fresh session
    // key using the same dual-layer scheme as the password login.
    // Otherwise we return vaultLocked=true and the desktop will
    // bounce the user to the browser to unlock manually.
    let vaultKey: string | null = null
    const existingKek = keyStore.getKEK(user.id)
    if (existingKek) {
      const sessionKey = crypto.randomBytes(32)
      const layer1 = encryptionService.encryptWithCustomKey(
        existingKek.toString('hex'),
        sessionKey
      )
      const layer2 = encryptionService.encrypt(layer1)
      await db
        .from('auth_access_tokens')
        .where('id', String(token.identifier))
        .update({ encrypted_kek: layer2 })
      vaultKey = sessionKey.toString('hex')
    }

    return response.ok({
      message: 'Session exchanged',
      user: UserTransformer.transform(user),
      token: token.value!.release(),
      vaultKey,
      vaultLocked: vaultKey === null,
    })
  }
}
