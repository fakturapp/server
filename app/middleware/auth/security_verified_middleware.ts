import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

const STEP_UP_WINDOW_MINUTES = 3

/**
 * Exige une vérification de sécurité récente (step-up) avant une action
 * sensible. La vérification est posée par /account/security/verify (email /
 * 2FA / code de récupération) ou par l'approbation depuis l'appareil
 * (/account/security/app-challenge). Elle est consommée à usage unique.
 *
 * Les sessions de l'app mobile (token nommé 'mobile') sont exemptées : elles
 * sont liées à l'appareil (Keychain) et verrouillées par Face ID, ce qui tient
 * lieu de step-up. Toute autre session (navigateur web) doit fournir la
 * vérification serveur.
 */
export default class SecurityVerifiedMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const user = auth.user!

    // Sans token résolu, on refuse (fail-closed).
    if (!user.currentAccessToken) {
      return response.unauthorized({ message: 'Authentication required' })
    }

    if (user.currentAccessToken.name === 'mobile') {
      return next()
    }

    // Vérification récente ET consommation atomiques (anti-rejeu concurrent).
    const cutoff = DateTime.now().minus({ minutes: STEP_UP_WINDOW_MINUTES }).toSQL()!
    const consumed = await db
      .from('users')
      .where('id', user.id)
      .whereNotNull('security_verified_at')
      .where('security_verified_at', '>=', cutoff)
      .update({ security_verified_at: null }, ['id'])

    if (!consumed || consumed.length === 0) {
      return response.forbidden({
        message: 'Vérification de sécurité requise pour cette action.',
        code: 'SECURITY_VERIFICATION_REQUIRED',
      })
    }

    // Aligne le modèle en mémoire pour qu'un user.save() ultérieur du
    // contrôleur ne ré-écrive pas l'ancienne valeur (ne pas dé-consommer).
    user.securityVerifiedAt = null

    return next()
  }
}
