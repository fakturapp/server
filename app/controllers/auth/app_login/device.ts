import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import LoginChallenge from '#models/auth/login_challenge'
import PushDevice from '#models/push/push_device'
import appLoginService from '#services/auth/app_login_service'

const enableValidator = vine.compile(
  vine.object({
    token: vine.string().trim().optional(),
    requireMatch: vine.boolean().optional(),
  })
)

const respondValidator = vine.compile(
  vine.object({
    approve: vine.boolean(),
    matchCode: vine.string().trim().optional(),
  })
)

export default class AppLoginDevice {
  /**
   * POST /v1/auth/app-login/enable  (app authentifiée)
   * Enrôle l'appareil courant comme authentificateur.
   */
  async enable({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(enableValidator)

    let device: PushDevice | null = null
    if (payload.token) {
      device = await PushDevice.query()
        .where('user_id', user.id)
        .where('token', payload.token)
        .first()
    }
    if (!device) {
      device = await PushDevice.query()
        .where('user_id', user.id)
        .orderBy('last_seen_at', 'desc')
        .first()
    }
    if (device) {
      device.appLoginEnabled = true
      await device.save()
    }

    user.appLoginEnabled = true
    if (typeof payload.requireMatch === 'boolean') {
      user.appLoginRequireMatch = payload.requireMatch
    }
    await user.save()

    return response.ok({
      enabled: true,
      requireMatch: user.appLoginRequireMatch,
      hasDevice: device !== null,
    })
  }

  /**
   * GET /v1/auth/app-login/pending  (app authentifiée)
   * Liste les demandes de connexion en attente (poll de l'app).
   */
  async pending({ auth, response }: HttpContext) {
    const user = auth.user!
    const challenges = await LoginChallenge.query()
      .where('user_id', user.id)
      .where('status', 'pending')
      .where('expires_at', '>', DateTime.now().toSQL()!)
      .orderBy('created_at', 'desc')

    return response.ok({
      challenges: challenges.map((challenge) => ({
        id: challenge.id,
        ipAddress: challenge.ipAddress,
        userAgent: challenge.userAgent,
        location: challenge.location,
        requireMatch: challenge.requireMatch,
        matchOptions: challenge.requireMatch
          ? appLoginService.matchOptions(challenge.matchCode)
          : [],
        createdAt: challenge.createdAt.toISO(),
        expiresAt: challenge.expiresAt.toISO(),
      })),
    })
  }

  /**
   * POST /v1/auth/app-login/:id/respond  (app authentifiée)
   * Approuve ou refuse une demande (avec number-matching si renforcé).
   */
  async respond({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(respondValidator)

    const challenge = await LoginChallenge.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .first()

    if (!challenge || !challenge.isPending) {
      return response.badRequest({ message: 'Challenge invalide ou expiré' })
    }

    if (payload.approve) {
      if (challenge.requireMatch && payload.matchCode !== challenge.matchCode) {
        return response.badRequest({ message: 'Numéro incorrect' })
      }
      challenge.status = 'approved'
    } else {
      challenge.status = 'denied'
    }
    challenge.respondedAt = DateTime.now()
    await challenge.save()

    return response.ok({ status: challenge.status })
  }
}
