import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import PushDevice from '#models/push/push_device'
import appLoginService from '#services/auth/app_login_service'

const updateValidator = vine.compile(vine.object({ requireMatch: vine.boolean() }))

export default class AppLoginSettings {
  /** GET /v1/account/app-login — état + appareils enrôlés. */
  async show({ auth, response }: HttpContext) {
    const user = auth.user!
    const devices = await appLoginService.enrolledDevices(user.id)

    return response.ok({
      enabled: user.appLoginEnabled,
      requireMatch: user.appLoginRequireMatch,
      devices: devices.map((device) => ({
        id: device.id,
        platform: device.platform,
        ip: device.lastIp,
        lastSeenAt: device.lastSeenAt?.toISO() ?? null,
      })),
    })
  }

  /** PUT /v1/account/app-login/require-match — bascule de l'authentification renforcée. */
  async updateRequireMatch({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { requireMatch } = await request.validateUsing(updateValidator)
    user.appLoginRequireMatch = requireMatch
    await user.save()
    return response.ok({ requireMatch })
  }

  /** DELETE /v1/account/app-login/devices/:id — retire un authentificateur. */
  async removeDevice({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const device = await PushDevice.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .first()
    if (device) {
      device.appLoginEnabled = false
      await device.save()
    }
    if (!(await appLoginService.hasEnrolledDevice(user.id))) {
      user.appLoginEnabled = false
      await user.save()
    }
    return response.ok({ enabled: user.appLoginEnabled })
  }

  /** DELETE /v1/account/app-login — désactive complètement. */
  async disable({ auth, response }: HttpContext) {
    const user = auth.user!
    await PushDevice.query()
      .where('user_id', user.id)
      .where('app_login_enabled', true)
      .update({ app_login_enabled: false })
    user.appLoginEnabled = false
    user.appLoginRequireMatch = false
    await user.save()
    return response.ok({ enabled: false })
  }
}
