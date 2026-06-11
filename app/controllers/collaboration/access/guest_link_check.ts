import type { HttpContext } from '@adonisjs/core/http'
import DocumentShareLink from '#models/collaboration/document_share_link'
import Team from '#models/team/team'
import teamEncryption from '#services/crypto/team_encryption_service'
import { collaborationEnabled } from '#services/billing/plan_entitlements'

export default class GuestLinkCheck {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const token = request.param('token') as string

    const link = await DocumentShareLink.query()
      .where('token', token)
      .where('is_active', true)
      .first()

    if (!link || link.isExpired) {
      return response.ok({ allowed: false })
    }

    if (!link.allowAnonymous || link.visibility !== 'anyone') {
      return response.ok({ allowed: false })
    }

    const team = await Team.find(link.teamId)
    if (!team || !collaborationEnabled(team) || teamEncryption.requiresUserKek(team)) {
      return response.ok({ allowed: false })
    }

    return response.ok({ allowed: true })
  }
}
