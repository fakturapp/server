import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/account/user'
import LoginChallenge from '#models/auth/login_challenge'
import AuditLog from '#models/shared/audit_log'
import LoginHistory from '#models/account/login_history'
import UserTransformer from '#transformers/user_transformer'
import appLoginService from '#services/auth/app_login_service'
import pushService from '#services/push/push_service'
import { realClientIp } from '#services/http/real_client_ip'
import { setAuthTokenCookie } from '#services/auth/auth_cookie'

const createValidator = vine.compile(vine.object({ userId: vine.string().trim() }))
const pollValidator = vine.compile(vine.object({ challengeId: vine.string().trim() }))

export default class AppLoginChallenge {
  /**
   * POST /v1/auth/login/app-challenge  (public)
   * Crée une demande d'approbation et la pousse aux appareils enrôlés.
   */
  async create(ctx: HttpContext) {
    const { request, response } = ctx
    const { userId } = await request.validateUsing(createValidator)

    const user = await User.find(userId)
    if (!user || user.status !== 'active' || !user.appLoginEnabled) {
      return response.badRequest({ message: 'App login not available for this account' })
    }
    if (!(await appLoginService.hasEnrolledDevice(user.id))) {
      return response.badRequest({ message: 'No enrolled device' })
    }

    const ip = realClientIp(ctx)
    const userAgent = request.header('user-agent') ?? null

    const challenge = await appLoginService.createChallenge(user, {
      ip,
      userAgent,
      location: null,
    })

    await pushService.notifyUser(user.id, 'login.request', {
      title: 'Tentative de connexion',
      body: challenge.requireMatch
        ? 'Approuvez et confirmez le numéro affiché'
        : 'Quelqu’un essaie de se connecter à votre compte',
      category: 'LOGIN_REQUEST',
      threadId: challenge.id,
      interruptionLevel: 'time-sensitive',
      relevanceScore: 1,
      data: { challengeId: challenge.id, deepLink: 'faktur://app-login' },
    })

    return response.ok({
      challengeId: challenge.id,
      requireMatch: challenge.requireMatch,
      matchCode: challenge.requireMatch ? challenge.matchCode : null,
      expiresIn: Math.max(0, Math.floor(challenge.expiresAt.diffNow('seconds').seconds)),
    })
  }

  /**
   * GET /v1/auth/login/app-challenge/:challengeId  (public, polling web)
   * Tant que pending → {status}. Une fois approuvé → émet le token (une seule fois).
   */
  async poll(ctx: HttpContext) {
    const { params, request, response } = ctx
    const { challengeId } = await pollValidator.validate({ challengeId: params.challengeId })

    const challenge = await LoginChallenge.find(challengeId)
    if (!challenge) {
      return response.notFound({ status: 'expired' })
    }
    if (challenge.status === 'denied') {
      return response.ok({ status: 'denied' })
    }
    if (challenge.expiresAt < DateTime.now() && challenge.status === 'pending') {
      challenge.status = 'expired'
      await challenge.save()
      return response.ok({ status: 'expired' })
    }
    if (challenge.status !== 'approved') {
      return response.ok({ status: 'pending' })
    }
    if (challenge.consumed) {
      return response.ok({ status: 'consumed' })
    }

    const user = await User.find(challenge.userId)
    if (!user || user.status !== 'active') {
      return response.unauthorized({ status: 'expired' })
    }

    challenge.consumed = true
    await challenge.save()

    const clientIp = realClientIp(ctx)
    const token = await User.accessTokens.create(user, ['*'], { expiresIn: '15 days' })
    await db
      .from('auth_access_tokens')
      .where('id', String(token.identifier))
      .update({
        ip_address: clientIp,
        user_agent: (request.header('user-agent') || '').slice(0, 512),
      })

    await LoginHistory.create({
      userId: user.id,
      tokenIdentifier: String(token.identifier),
      ipAddress: clientIp,
      userAgent: request.header('user-agent') ?? undefined,
      status: 'success',
      isSuspicious: false,
    })
    await AuditLog.create({
      userId: user.id,
      action: 'user.login',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: clientIp,
      userAgent: request.header('user-agent'),
      severity: 'info',
      metadata: { method: 'app' },
    })

    const tokenValue = token.value!.release()
    setAuthTokenCookie(response, tokenValue)

    return response.ok({
      status: 'approved',
      token: tokenValue,
      user: await ctx.serialize.withoutWrapping(UserTransformer.transform(user)),
    })
  }
}
