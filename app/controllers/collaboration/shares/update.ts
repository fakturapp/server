import type { HttpContext } from '@adonisjs/core/http'
import DocumentShare from '#models/collaboration/document_share'
import { updateShareValidator } from '#validators/collaboration_validator'
import { updateCollaboratorPermission } from '#services/collaboration/websocket_service'
import DocumentAccessService from '#services/collaboration/document_access_service'

export default class Update {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!

    const shareId = request.param('shareId') as string
    const payload = await request.validateUsing(updateShareValidator)

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

    if (payload.permission !== undefined) share.permission = payload.permission
    if (payload.canShare !== undefined) share.canShare = payload.canShare
    await share.save()

    if (payload.permission !== undefined && share.sharedWithUserId) {
      await updateCollaboratorPermission(
        share.documentType,
        share.documentId,
        share.sharedWithUserId,
        share.permission
      )
    }

    return response.ok({
      message: 'Permission updated',
      data: { id: share.id, permission: share.permission, canShare: share.canShare },
    })
  }
}
