import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import DocumentShareLink from '#models/collaboration/document_share_link'
import { createShareLinkValidator } from '#validators/collaboration_validator'
import DocumentAccessService from '#services/collaboration/document_access_service'

export default class Create {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!

    const payload = await request.validateUsing(createShareLinkValidator)

    const accessService = new DocumentAccessService()
    const teamId = await accessService.getShareManagementTeamId(
      payload.documentType,
      payload.documentId,
      user.id,
      user.currentTeamId
    )
    if (!teamId) {
      return response.notFound({ message: 'Document not found' })
    }

    const document = await accessService.getDocument(
      payload.documentType,
      payload.documentId,
      teamId
    )
    if (!document) {
      return response.notFound({ message: 'Document not found' })
    }

    const isTeamMember = user.currentTeamId === teamId

    const visibility = payload.visibility || 'team'
    const allowAnonymous = payload.allowAnonymous ?? false

    if (!isTeamMember && (allowAnonymous || visibility === 'anyone')) {
      return response.forbidden({
        message:
          "Seul un membre de l'équipe propriétaire peut créer un lien public anonyme. Vous pouvez créer un lien restreint à l'équipe.",
        code: 'permission_anonymous_link_team_member_only',
      })
    }

    const token = randomBytes(32).toString('hex')

    const link = await DocumentShareLink.create({
      teamId,
      documentType: payload.documentType,
      documentId: payload.documentId,
      token,
      permission: payload.permission,
      visibility,
      autoExpire: payload.autoExpire ?? false,
      allowAnonymous,
      allowResharing: payload.allowResharing ?? false,
      createdByUserId: user.id,
      isActive: true,
    })

    return response.created({
      message: 'Share link created',
      data: {
        id: link.id,
        token: link.token,
        permission: link.permission,
        visibility: link.visibility,
        autoExpire: link.autoExpire,
        allowAnonymous: link.allowAnonymous,
        allowResharing: link.allowResharing,
        isActive: link.isActive,
        expiresAt: link.expiresAt?.toISO() ?? null,
        createdAt: link.createdAt.toISO(),
      },
    })
  }
}
