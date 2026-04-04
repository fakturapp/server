import type { HttpContext } from '@adonisjs/core/http'
import DocumentShareLink from '#models/collaboration/document_share_link'
import DocumentShare from '#models/collaboration/document_share'

/**
 * Public endpoint (requires auth but not vault) to validate a share link token
 * and establish access for the authenticated user.
 */
export default class ValidateLink {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.user!
    const token = request.param('token') as string

    const link = await DocumentShareLink.query()
      .where('token', token)
      .where('is_active', true)
      .preload('createdBy')
      .first()

    if (!link) {
      return response.notFound({ message: 'This share link is invalid or has been deactivated' })
    }

    if (link.isExpired) {
      return response.gone({ message: 'This share link has expired' })
    }

    // Check visibility: 'team' means only team members can access
    if (link.visibility === 'team' && user.currentTeamId !== link.teamId) {
      return response.forbidden({ message: 'This link is restricted to team members' })
    }

    // Check if the user is the document owner (same team) — skip creating a share
    if (user.currentTeamId === link.teamId) {
      return response.ok({
        message: 'Access granted (team member)',
        data: {
          documentType: link.documentType,
          documentId: link.documentId,
          permission: 'editor',
          isOwner: true,
        },
      })
    }

    // Check for existing active share for this user
    let share = await DocumentShare.query()
      .where('document_type', link.documentType)
      .where('document_id', link.documentId)
      .where('shared_with_user_id', user.id)
      .where('status', 'active')
      .first()

    if (!share) {
      // Create a new share from the link
      share = await DocumentShare.create({
        teamId: link.teamId,
        documentType: link.documentType,
        documentId: link.documentId,
        sharedByUserId: link.createdByUserId,
        sharedWithUserId: user.id,
        sharedWithEmail: user.email,
        permission: link.permission,
        status: 'active',
      })
    }

    return response.ok({
      message: 'Access granted via share link',
      data: {
        documentType: link.documentType,
        documentId: link.documentId,
        permission: share.permission,
        isOwner: false,
        shareId: share.id,
      },
    })
  }
}
