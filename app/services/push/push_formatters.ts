/**
 * Formatage des montants pour les libellés de notification (fr-FR).
 */
export function formatPushAmount(amount: number, currency: string = 'EUR'): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}
