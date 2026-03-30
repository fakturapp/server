import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import mail from '@adonisjs/mail/services/main'
import TeamMember from '#models/team/team_member'
import keyStore from '#services/crypto/key_store'
import AccountDeletedNotification from '#mails/account_deleted_notification'
import { validateDeletionSession } from './_helpers.js'

const confirmValidator = vine.compile(
  vine.object({
    confirmText: vine.string().trim(),
  })
)

export default class Confirm {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const token = request.header('x-deletion-token')

    const error = validateDeletionSession(user, token, 5)
    if (error) return response.badRequest({ message: error })

    const payload = await request.validateUsing(confirmValidator)

    if (payload.confirmText.toLowerCase() !== 'supprimer') {
      return response.unprocessableEntity({ message: 'Tapez "supprimer" pour confirmer' })
    }

    // Safety check: ensure no owned teams remain
    const ownedTeams = await TeamMember.query()
      .where('userId', user.id)
      .where('role', 'super_admin')
      .where('status', 'active')

    if (ownedTeams.length > 0) {
      return response.badRequest({
        message: 'Vous possédez encore des équipes. Supprimez-les ou transférez-les avant de continuer.',
      })
    }

    // Save email and name before deletion
    const email = user.email
    const name = user.fullName || undefined

    // Clear crypto keys
    keyStore.clear(user.id)

    // Remove circular FK reference
    user.currentTeamId = null
    await user.save()

    // Hard delete user — CASCADE handles: auth_access_tokens, login_histories, auth_providers, team_members
    await user.delete()

    // Send confirmation email
    await mail.sendLater(new AccountDeletedNotification(email, name))

    return response.ok({ message: 'Compte supprimé définitivement' })
  }
}
