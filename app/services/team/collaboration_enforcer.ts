import { DateTime } from 'luxon'
import Team from '#models/team/team'
import TeamMember from '#models/team/team_member'
import keyStore from '#services/crypto/key_store'
import { COLLABORATION_GRACE_DAYS } from '#services/billing/plan_entitlements'

async function countActiveExtras(teamId: string): Promise<number> {
  const row = await TeamMember.query()
    .where('teamId', teamId)
    .where('status', 'active')
    .whereNot('role', 'super_admin')
    .count('* as total')
    .first()
  return Number(row?.$extras.total ?? 0)
}

export async function startCollaborationGrace(team: Team): Promise<void> {
  const extras = await countActiveExtras(team.id)
  team.collaborationGraceEndsAt =
    extras > 0 ? DateTime.now().plus({ days: COLLABORATION_GRACE_DAYS }) : null
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

  const extras = await TeamMember.query()
    .where('teamId', team.id)
    .where('status', 'active')
    .whereNot('role', 'super_admin')

  let count = 0
  for (const member of extras) {
    member.status = 'inactive'
    await member.save()
    if (member.userId) keyStore.clear(member.userId)
    count++
  }

  team.collaborationGraceEndsAt = null
  await team.save()
  return count
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
