import type { HttpContext } from '@adonisjs/core/http'
import { updateProfileValidator } from '#validators/account_validator'

export default class Update {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(updateProfileValidator)

    if (payload.fullName !== undefined) user.fullName = payload.fullName
    if (payload.avatarUrl !== undefined) user.avatarUrl = payload.avatarUrl

    await user.save()

    return response.ok({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    })
  }
}
