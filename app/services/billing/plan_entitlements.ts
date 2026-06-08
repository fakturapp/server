import type Team from '#models/team/team'

export const COLLABORATION_GRACE_DAYS = 7

export function isPro(team: Team): boolean {
  return team.plan === 'pro' || team.plan === 'team'
}

export function isTeamPlan(team: Team): boolean {
  return team.plan === 'team'
}

export function collaborationEnabled(team: Team): boolean {
  return team.plan === 'team'
}

export function memberLimit(team: Team): number {
  return team.plan === 'team' ? 15 : 1
}

export function apiKeyLimit(team: Team): number {
  if (team.plan === 'team') return 5
  if (team.plan === 'pro') return 2
  return 1
}

export function projectLimit(team: Team): number {
  if (team.plan === 'team') return 20
  if (team.plan === 'pro') return 3
  return 1
}

export function apiExplorerEnabled(team: Team): boolean {
  return team.plan === 'pro' || team.plan === 'team'
}
