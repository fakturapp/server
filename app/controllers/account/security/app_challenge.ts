import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import LoginChallenge from '#models/auth/login_challenge'
import appLoginService from '#services/auth/app_login_service'
import pushService from '#services/push/push_service'
import { realClientIp } from '#services/http/real_client_ip'

export default class AccountSecurityAppChallenge {
  /**
   * POST /v1/account/security/app-challenge
   * Crée une demande de vérification de sécurité approuvée depuis l'appareil.
   */
  async create(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!

    if (!(await appLoginService.hasEnrolledDevice(user.id))) {
      return response.badRequest({ message: 'No enrolled device', error_code: 'no_enrolled_device' })
    }

    const challenge = await appLoginService.createChallenge(
      user,
      {
        ip: realClientIp(ctx),
        userAgent: request.header('user-agent') ?? null,
        location: null,
      },
      'account_verify',
      true
    )

    await pushService.notifyUser(user.id, 'login.request', {
      title: 'Vérification de sécurité',
      body: challenge.requireMatch
        ? 'Approuvez et confirmez le numéro affiché'
        : 'Approuvez cette action depuis votre compte',
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
   * GET /v1/account/security/app-challenge/:challengeId
   * Polling web : renvoie {verified:true} une fois approuvé (sans émettre de token).
   */
  async poll({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const challenge = await LoginChallenge.find(params.challengeId)

    if (!challenge || challenge.userId !== user.id || challenge.purpose !== 'account_verify') {
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

    challenge.consumed = true
    challenge.verifiedAt = DateTime.now()
    await challenge.save()

    user.securityVerifiedAt = DateTime.now()
    await user.save()

    return response.ok({ status: 'approved', verified: true })
  }
}
