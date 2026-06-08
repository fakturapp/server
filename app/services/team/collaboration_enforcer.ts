import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import Team from '#models/team/team'
import TeamMember from '#models/team/team_member'
import keyStore from '#services/crypto/key_store'
import { COLLABORATION_GRACE_DAYS } from '#services/billing/plan_entitlements'
import { TeamAccessRestrictionWarning } from '#mails/team_access_restriction_warning'
import { TeamAccessRestricted } from '#mails/team_access_restricted'

async function activeExtras(teamId: string): Promise<TeamMember[]> {
  return TeamMember.query()
    .where('teamId', teamId)
    .where('status', 'active')
    .whereNot('role', 'super_admin')
    .preload('user')
}

export async function startCollaborationGrace(team: Team): Promise<void> {
  const extras = await activeExtras(team.id)
  if (extras.length === 0) {
    team.collaborationGraceEndsAt = null
    return
  }

  team.collaborationGraceEndsAt = DateTime.now().plus({ days: COLLABORATION_GRACE_DAYS })
  const graceDate = team.collaborationGraceEndsAt.setLocale('fr').toLocaleString(DateTime.DATE_FULL)
  for (const member of extras) {
    const email = member.user?.email
    if (!email) continue
    try {
      await mail.sendLater(
        new TeamAccessRestrictionWarning(
          email,
          team.name,
          graceDate,
          member.user?.fullName ?? undefined
        )
      )
    } catch {}
  }
}

export async function clearCollaborationGraceAndReactivate(team: Team): Promise<void> {
  team.collaborationGraceEndsAt = null
  const deactivated = await TeamMember.query().where('teamId', team.id).where('status', 'inactive')
  for (const member of deactivated) {
    member.status = 'active'
    await member.save()
  }
}

export async function deactivateExcessMembers(team: Team): Promise<number> {
  await TeamMember.query().where('teamId', team.id).where('status', 'pending').delete()

  const extras = await activeExtras(team.id)

  const restricted: TeamMember[] = []
  for (const member of extras) {
    member.status = 'inactive'
    await member.save()
    if (member.userId) keyStore.clear(member.userId)
    restricted.push(member)
  }

  team.collaborationGraceEndsAt = null
  await team.save()

  for (const member of restricted) {
    const email = member.user?.email
    if (!email) continue
    try {
      await mail.sendLater(
        new TeamAccessRestricted(email, team.name, member.user?.fullName ?? undefined)
      )
    } catch {}
  }

  return restricted.length
}

export async function enforceExpiredCollaborationGrace(): Promise<number> {
  const teams = await Team.query().whereNot('plan', 'team').whereNotNull('collaborationGraceEndsAt')

  let deactivated = 0
  for (const team of teams) {
    if (team.collaborationGraceEndsAt && team.collaborationGraceEndsAt <= DateTime.now()) {
      deactivated += await deactivateExcessMembers(team)
    }
  }
  return deactivated
}
