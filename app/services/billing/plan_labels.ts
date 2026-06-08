export function planLabel(plan: string | null | undefined): string {
  if (plan === 'pro') return 'Pro'
  if (plan === 'team') return 'Team'
  return 'Gratuit'
}

export function periodLabel(period: string | null | undefined): string {
  if (period === 'annual') return 'Annuelle'
  return 'Mensuelle'
}
