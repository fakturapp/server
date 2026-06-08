import { DateTime } from 'luxon'
import Team from '#models/team/team'
import ApiKey from '#models/api/api_key'
import ApiProject from '#models/api/api_project'
import {
  apiKeyLimit,
  projectLimit,
  COLLABORATION_GRACE_DAYS,
} from '#services/billing/plan_entitlements'

async function activeKeyCount(teamId: string): Promise<number> {
  const row = await ApiKey.query()
    .where('teamId', teamId)
    .whereNull('revokedAt')
    .whereNull('suspendedAt')
    .count('* as total')
    .first()
  return Number(row?.$extras.total ?? 0)
}

async function activeProjectCount(teamId: string): Promise<number> {
  const row = await ApiProject.query()
    .where('teamId', teamId)
    .where('isArchived', false)
    .whereNull('suspendedAt')
    .count('* as total')
    .first()
  return Number(row?.$extras.total ?? 0)
}

export async function startApiGrace(team: Team): Promise<void> {
  const [keys, projects] = await Promise.all([activeKeyCount(team.id), activeProjectCount(team.id)])
  const over = keys > apiKeyLimit(team) || projects > projectLimit(team)
  team.apiGraceEndsAt = over ? DateTime.now().plus({ days: COLLABORATION_GRACE_DAYS }) : null
}

export async function restoreApiResources(team: Team): Promise<void> {
  team.apiGraceEndsAt = null

  const keys = await ApiKey.query().where('teamId', team.id).whereNotNull('suspendedAt')
  for (const key of keys) {
    key.suspendedAt = null
    await key.save()
  }

  const projects = await ApiProject.query().where('teamId', team.id).whereNotNull('suspendedAt')
  for (const project of projects) {
    project.suspendedAt = null
    await project.save()
  }
}

export async function suspendExcessApiResources(
  team: Team
): Promise<{ keys: number; projects: number }> {
  const now = DateTime.now()

  const keyMax = apiKeyLimit(team)
  const keys = await ApiKey.query()
    .where('teamId', team.id)
    .whereNull('revokedAt')
    .whereNull('suspendedAt')
    .orderBy('createdAt', 'asc')
  let keysSuspended = 0
  for (let i = keyMax; i < keys.length; i++) {
    keys[i].suspendedAt = now
    await keys[i].save()
    keysSuspended++
  }

  const projectMax = projectLimit(team)
  const projects = await ApiProject.query()
    .where('teamId', team.id)
    .where('isArchived', false)
    .whereNull('suspendedAt')
    .orderBy('isDefault', 'desc')
    .orderBy('createdAt', 'asc')
  let projectsSuspended = 0
  for (let i = projectMax; i < projects.length; i++) {
    projects[i].suspendedAt = now
    await projects[i].save()
    projectsSuspended++
  }

  team.apiGraceEndsAt = null
  await team.save()
  return { keys: keysSuspended, projects: projectsSuspended }
}

export async function enforceExpiredApiGrace(): Promise<{ keys: number; projects: number }> {
  const teams = await Team.query().whereNotNull('apiGraceEndsAt')

  let keys = 0
  let projects = 0
  for (const team of teams) {
    if (team.apiGraceEndsAt && team.apiGraceEndsAt <= DateTime.now()) {
      const result = await suspendExcessApiResources(team)
      keys += result.keys
      projects += result.projects
    }
  }
  return { keys, projects }
}
