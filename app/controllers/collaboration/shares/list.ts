import type { HttpContext } from '@adonisjs/core/http'
import DocumentShare from '#models/collaboration/document_share'
import type { DocumentType } from '#models/collaboration/document_share'
import DocumentAccessService from '#services/collaboration/document_access_service'

export default class List {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const documentType = request.param('documentType') as DocumentType
    const documentId = request.param('documentId') as string

    const accessService = new DocumentAccessService()
    const document = await accessService.getDocument(documentType, documentId, teamId)
    if (!document) {
      return response.notFound({ message: 'Document not found' })
    }

    const shares = await DocumentShare.query()
      .where('document_type', documentType)
      .where('document_id', documentId)
      .where('team_id', teamId)
      .whereNot('status', 'revoked')
      .preload('sharedWith')
      .preload('sharedBy')
      .orderBy('created_at', 'desc')

    return response.ok({
      data: shares.map((share) => ({
        id: share.id,
        permission: share.permission,
        status: share.status,
        sharedWithEmail: share.sharedWithEmail,
        sharedWith: share.sharedWith
          ? {
              id: share.sharedWith.id,
              fullName: share.sharedWith.fullName,
              email: share.sharedWith.email,
              avatarUrl: (share.sharedWith as any).avatarUrl ?? null,
            }
          : null,
        sharedBy: {
          id: share.sharedBy.id,
          fullName: share.sharedBy.fullName,
        },
        createdAt: share.createdAt.toISO(),
      })),
    })
  }
}
