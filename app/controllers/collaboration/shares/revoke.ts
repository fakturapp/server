import type { HttpContext } from '@adonisjs/core/http'
import DocumentShare from '#models/collaboration/document_share'
import { disconnectUserFromDocument } from '#services/collaboration/websocket_service'
import DocumentAccessService from '#services/collaboration/document_access_service'

export default class Revoke {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!

    const shareId = request.param('shareId') as string

    const share = await DocumentShare.query()
      .where('id', shareId)
      .whereNot('status', 'revoked')
      .first()

    if (!share) {
      return response.notFound({ message: 'Share not found' })
    }

    const accessService = new DocumentAccessService()
    const teamId = await accessService.getShareManagementTeamId(
      share.documentType,
      share.documentId,
      user.id,
      user.currentTeamId
    )
    if (!teamId || teamId !== share.teamId) {
      return response.notFound({ message: 'Share not found' })
    }

    share.status = 'revoked'
    await share.save()

    if (share.sharedWithUserId) {
      await disconnectUserFromDocument(share.documentType, share.documentId, share.sharedWithUserId)
    }

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
