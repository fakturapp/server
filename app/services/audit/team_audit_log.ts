import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/shared/audit_log'

export type TeamAuditAction =
  | 'team.invite_sent'
  | 'team.invite_accepted'
  | 'team.invite_revoked'
  | 'team.member_removed'
  | 'team.member_left'
  | 'team.role_updated'
  | 'team.ownership_transferred'
  | 'team.deleted'
  | 'team.exported'
  | 'team.imported'

export type TeamAuditSeverity = 'info' | 'warning' | 'critical'

export async function logTeamAction(
  ctx: HttpContext,
  action: TeamAuditAction,
  options: {
    teamId: string | null
    severity?: TeamAuditSeverity
    metadata?: Record<string, unknown>
  }
) {
  const user = ctx.auth.user
  try {
    await AuditLog.create({
      userId: user?.id ?? null,
      action,
      resourceType: 'team',
      resourceId: options.teamId,
      metadata: options.metadata ?? null,
      ipAddress: ctx.request.ip(),
      userAgent: ctx.request.header('user-agent') ?? null,
      severity: options.severity ?? 'info',
    })
  } catch {
    // audit logging must never break the request
  }
}
