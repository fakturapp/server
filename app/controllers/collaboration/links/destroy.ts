import type { HttpContext } from '@adonisjs/core/http'
import DocumentShareLink from '#models/collaboration/document_share_link'
import DocumentAccessService from '#services/collaboration/document_access_service'

export default class Destroy {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!

    const linkId = request.param('linkId') as string

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

    link.isActive = false
    await link.save()

    return response.ok({ message: 'Share link deactivated' })
  }
}
