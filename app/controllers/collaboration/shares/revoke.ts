import type { HttpContext } from '@adonisjs/core/http'
import DocumentShare from '#models/collaboration/document_share'

export default class Revoke {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const shareId = request.param('shareId') as string

    const share = await DocumentShare.query()
      .where('id', shareId)
      .where('team_id', teamId)
      .whereNot('status', 'revoked')
      .first()

    if (!share) {
      return response.notFound({ message: 'Share not found' })
    }

    share.status = 'revoked'
    await share.save()

    return response.ok({
      message: 'Access revoked',
      data: {
        id: share.id,
        sharedWithUserId: share.sharedWithUserId,
        documentType: share.documentType,
        documentId: share.documentId,
      },
    })
  }
}
