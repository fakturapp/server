import type { HttpContext } from '@adonisjs/core/http'
import PushDevice from '#models/push/push_device'

export default class UnregisterDevice {
  async handle({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const token = decodeURIComponent(params.token)

    await PushDevice.query().where('user_id', user.id).where('token', token).delete()

    return response.ok({ message: 'Device unregistered' })
  }
}
