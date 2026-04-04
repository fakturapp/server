import type { HttpContext } from '@adonisjs/core/http'
import DocumentShareLink from '#models/collaboration/document_share_link'

export default class Destroy {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const linkId = request.param('linkId') as string

    const link = await DocumentShareLink.query()
      .where('id', linkId)
      .where('team_id', teamId)
      .first()

    if (!link) {
      return response.notFound({ message: 'Share link not found' })
    }

    link.isActive = false
    await link.save()

    return response.ok({ message: 'Share link deactivated' })
  }
}
