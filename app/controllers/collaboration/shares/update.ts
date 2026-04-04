import type { HttpContext } from '@adonisjs/core/http'
import DocumentShare from '#models/collaboration/document_share'
import { updateShareValidator } from '#validators/collaboration_validator'

export default class Update {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const shareId = request.param('shareId') as string
    const payload = await request.validateUsing(updateShareValidator)

    const share = await DocumentShare.query()
      .where('id', shareId)
      .where('team_id', teamId)
      .whereNot('status', 'revoked')
      .first()

    if (!share) {
      return response.notFound({ message: 'Share not found' })
    }

    share.permission = payload.permission
    await share.save()

    return response.ok({
      message: 'Permission updated',
      data: { id: share.id, permission: share.permission },
    })
  }
}
