import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import hash from '@adonisjs/core/services/hash'
import { validateDeletionSession } from './_helpers.js'

const verifyPasswordValidator = vine.compile(
  vine.object({
    password: vine.string(),
  })
)

export default class VerifyPassword {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const token = request.header('x-deletion-token')

    const error = validateDeletionSession(user, token, 4)
    if (error) return response.badRequest({ message: error })

    const payload = await request.validateUsing(verifyPasswordValidator)

    const isValid = await hash.verify(user.password, payload.password)
    if (!isValid) {
      return response.unauthorized({ message: 'Mot de passe incorrect' })
    }

    user.deletionStep = 5
    await user.save()

    return response.ok({ message: 'Mot de passe vérifié' })
  }
}
