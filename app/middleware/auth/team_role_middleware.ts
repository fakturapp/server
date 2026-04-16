import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import TeamMember from '#models/team/team_member'
import { ApiError } from '#exceptions/api_error'

type Role = 'viewer' | 'member' | 'admin' | 'super_admin'

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  super_admin: 3,
}

export default class TeamRoleMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { min?: Role; allow?: Role[] } = {}
  ) {
    const user = ctx.auth.user
    if (!user || !user.currentTeamId) {
      throw new ApiError('team_not_selected')
    }

    const membership = await TeamMember.query()
      .where('team_id', user.currentTeamId)
      .where('user_id', user.id)
      .where('status', 'active')
      .first()

    if (!membership) {
      throw new ApiError('permission_not_team_member')
    }

    const role = membership.role as Role
    const minRole = options.min ?? 'admin'
    const allowed =
      options.allow && options.allow.length > 0
        ? options.allow.includes(role)
        : ROLE_RANK[role] >= ROLE_RANK[minRole]

    if (!allowed) {
      throw new ApiError('permission_team_role_required')
    }

    ;(ctx as any).teamMembership = membership

    return next()
  }
}
