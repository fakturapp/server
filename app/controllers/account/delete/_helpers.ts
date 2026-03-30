import { DateTime } from 'luxon'
import type User from '#models/account/user'

const DELETION_SESSION_TTL_MINUTES = 30

/**
 * Validates that the user has an active deletion session with a matching token
 * and is at or past the required step. Returns an error message if invalid.
 */
export function validateDeletionSession(
  user: User,
  token: string | undefined,
  requiredStep?: number
): string | null {
  if (!user.deletionToken || !user.deletionStartedAt) {
    return 'Aucune session de suppression en cours'
  }

  if (user.deletionToken !== token) {
    return 'Token de suppression invalide'
  }

  // Check TTL
  const elapsed = DateTime.now().diff(user.deletionStartedAt, 'minutes').minutes
  if (elapsed > DELETION_SESSION_TTL_MINUTES) {
    return 'La session de suppression a expiré. Veuillez recommencer.'
  }

  // Check step progression
  if (requiredStep !== undefined && user.deletionStep < requiredStep) {
    return 'Étape de suppression invalide'
  }

  return null
}
