import type { HttpContext } from '@adonisjs/core/http'
import DocumentShareLink from '#models/collaboration/document_share_link'
import { updateShareLinkValidator } from '#validators/collaboration_validator'
import DocumentAccessService from '#services/collaboration/document_access_service'

export default class Update {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!

    const linkId = request.param('linkId') as string
    const payload = await request.validateUsing(updateShareLinkValidator)

    const link = await DocumentShareLink.query().where('id', linkId).first()

    if (!link) {
      return response.notFound({ message: 'Share link not found' })
    }

    const accessService = new DocumentAccessService()
    const teamId = await accessService.getShareManagementTeamId(
      link.documentType,
      link.documentId,
      user.id,
      user.currentTeamId
    )
    if (!teamId || teamId !== link.teamId) {
      return response.notFound({ message: 'Share link not found' })
    }

    if (payload.permission !== undefined) link.permission = payload.permission
    if (payload.visibility !== undefined) link.visibility = payload.visibility
    if (payload.isActive !== undefined) link.isActive = payload.isActive
    if (payload.allowAnonymous !== undefined) link.allowAnonymous = payload.allowAnonymous
    if (payload.allowResharing !== undefined) link.allowResharing = payload.allowResharing

    await link.save()

    return response.ok({
      message: 'Share link updated',
      data: {
        id: link.id,
        token: link.token,
        permission: link.permission,
        visibility: link.visibility,
        allowAnonymous: link.allowAnonymous,
        allowResharing: link.allowResharing,
        isActive: link.isActive,
      },
    })
  }
}
