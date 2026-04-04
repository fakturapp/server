import type { HttpContext } from '@adonisjs/core/http'
import DocumentShareLink from '#models/collaboration/document_share_link'
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

    const links = await DocumentShareLink.query()
      .where('document_type', documentType)
      .where('document_id', documentId)
      .where('team_id', teamId)
      .where('is_active', true)
      .orderBy('created_at', 'desc')

    return response.ok({
      data: links.map((link) => ({
        id: link.id,
        token: link.token,
        permission: link.permission,
        isActive: link.isActive,
        expiresAt: link.expiresAt?.toISO() ?? null,
        createdAt: link.createdAt.toISO(),
      })),
    })
  }
}
