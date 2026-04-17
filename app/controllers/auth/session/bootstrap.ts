import type { HttpContext } from '@adonisjs/core/http'
import { Secret } from '@adonisjs/core/helpers'
import vine from '@vinejs/vine'
import User from '#models/account/user'
import UserTransformer from '#transformers/user_transformer'
import { setAuthSessionCookies } from '#services/auth/auth_cookie_service'
import env from '#start/env'

const bootstrapSessionValidator = vine.compile(
  vine.object({
    token: vine.string().trim().minLength(20).maxLength(2048),
    vaultKey: vine.string().trim().fixedLength(64).optional(),
  })
)

export default class Bootstrap {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const requestOrigin = request.header('origin')
    const frontendOrigin = new URL(env.get('FRONTEND_URL', 'http://localhost:3000')).origin

    if (requestOrigin && requestOrigin !== frontendOrigin) {
      return response.forbidden({ message: 'Untrusted origin' })
    }

    const payload = await request.validateUsing(bootstrapSessionValidator)

    const accessToken = await User.accessTokens.verify(new Secret(payload.token))
    if (!accessToken) {
      return response.unauthorized({ message: 'Invalid session token' })
    }

    const user = await User.find(accessToken.tokenableId)
    if (!user || user.status !== 'active') {
      return response.unauthorized({ message: 'User not found or inactive' })
    }

    setAuthSessionCookies(response, {
      authToken: payload.token,
      vaultKey: payload.vaultKey ?? null,
    })

    return response.ok({
      message: 'Session bootstrapped',
      user: await ctx.serialize.withoutWrapping(UserTransformer.transform(user)),
      vaultLocked: !payload.vaultKey,
    })
  }
}
