import type Team from '#models/team/team'

export function isPro(team: Team): boolean {
  return team.plan === 'pro' || team.plan === 'team'
}
