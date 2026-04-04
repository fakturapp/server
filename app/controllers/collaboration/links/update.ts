import type { HttpContext } from '@adonisjs/core/http'
import DocumentShareLink from '#models/collaboration/document_share_link'
import { updateShareLinkValidator } from '#validators/collaboration_validator'

export default class Update {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const linkId = request.param('linkId') as string
    const payload = await request.validateUsing(updateShareLinkValidator)

    const link = await DocumentShareLink.query()
      .where('id', linkId)
      .where('team_id', teamId)
      .first()

    if (!link) {
      return response.notFound({ message: 'Share link not found' })
    }

    if (payload.permission !== undefined) link.permission = payload.permission
    if (payload.isActive !== undefined) link.isActive = payload.isActive

    await link.save()

    return response.ok({
      message: 'Share link updated',
      data: {
        id: link.id,
        token: link.token,
        permission: link.permission,
        isActive: link.isActive,
      },
    })
  }
}
