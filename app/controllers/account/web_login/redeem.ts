import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'
import db from '@adonisjs/lucid/services/db'
import User from '#models/account/user'
import oauthCrypto from '#services/oauth/oauth_crypto_service'
import UserTransformer from '#transformers/user_transformer'

const redeemValidator = vine.compile(
  vine.object({
    code: vine.string().trim().minLength(16),
  })
)

export default class RedeemWebLoginToken {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    response.header('Cache-Control', 'no-store')
    response.header('Referrer-Policy', 'no-referrer')

    const { code } = await request.validateUsing(redeemValidator)
    const codeHash = oauthCrypto.hash(code)
    const now = DateTime.now()

    const updated = await db
      .from('web_login_tokens')
      .where('code_hash', codeHash)
      .whereNull('used_at')
      .where('expires_at', '>', now.toSQL()!)
      .update({ used_at: now.toSQL()! }, ['user_id'])

    const userId = Array.isArray(updated) && updated.length > 0 ? (updated[0] as any).user_id : null
    if (!userId) {
      return response.badRequest({
        error: 'invalid_code',
        error_description: 'Code invalide, expiré ou déjà utilisé',
      })
    }

    const user = await User.find(userId)
    if (!user || user.status !== 'active') {
      return response.unauthorized({
        error: 'invalid_user',
        error_description: 'Utilisateur introuvable ou inactif',
      })
    }

    const token = await User.accessTokens.create(user, ['*'], { expiresIn: '1 day' })

    user.lastLoginAt = now
    await user.save()

    const serializedUser = await ctx.serialize.withoutWrapping(UserTransformer.transform(user))

    return response.ok({
      token: token.value!.release(),
      user: serializedUser,
    })
  }
}
