import type { HttpContext } from '@adonisjs/core/http'
import Feedback from '#models/admin/feedback'

export default class Mine {
  async handle({ auth, response }: HttpContext) {
    const user = auth.user!
    const feedback = await Feedback.query().where('userId', user.id).first()

    return response.ok({
      feedback: feedback
        ? { id: feedback.id, rating: feedback.rating, comment: feedback.comment }
        : null,
    })
  }
}
