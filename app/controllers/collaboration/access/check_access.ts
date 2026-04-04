import type { HttpContext } from '@adonisjs/core/http'
import DocumentShare from '#models/collaboration/document_share'
import type { DocumentType } from '#models/collaboration/document_share'

/**
 * Check the current user's access level on a given document.
 * Returns permission level or 403 if no access.
 */
export default class CheckAccess {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId

    const documentType = request.param('documentType') as DocumentType
    const documentId = request.param('documentId') as string

    // Team members have full editor access
    if (teamId) {
      // Check if this document belongs to the user's team
      const { default: DocumentAccessService } = await import(
        '#services/collaboration/document_access_service'
      )
      const accessService = new DocumentAccessService()
      const document = await accessService.getDocument(documentType, documentId, teamId)
      if (document) {
        return response.ok({
          data: { permission: 'editor', isOwner: true },
        })
      }
    }

    // Check shared access
    const share = await DocumentShare.query()
      .where('document_type', documentType)
      .where('document_id', documentId)
      .where('shared_with_user_id', user.id)
      .where('status', 'active')
      .first()

    if (share) {
      return response.ok({
        data: { permission: share.permission, isOwner: false, shareId: share.id },
      })
    }

    return response.forbidden({ message: 'You do not have access to this document' })
  }
}
