import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'
import mail from '@adonisjs/mail/services/main'
import Team from '#models/team/team'
import TeamMember from '#models/team/team_member'
import User from '#models/account/user'
import billingService from '#services/billing/billing_service'
import { planLabel } from '#services/billing/plan_labels'
import { SubscriptionCanceledNotification } from '#mails/subscription_canceled_notification'

const cancelValidator = vine.compile(
  vine.object({
    resume: vine.boolean().optional(),
  })
)

export default class Cancel {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!

    if (!billingService.isConfigured()) {
      return response.serviceUnavailable({ message: "Le paiement n'est pas encore configuré." })
    }
    if (!user.currentTeamId) {
      return response.badRequest({ message: 'Aucune équipe sélectionnée' })
    }

    const member = await TeamMember.query()
      .where('teamId', user.currentTeamId)
      .where('userId', user.id)
      .where('status', 'active')
      .first()
    if (!member || member.role !== 'super_admin') {
      return response.forbidden({ message: "Seul le propriétaire peut gérer l'abonnement." })
    }

    const team = await Team.findOrFail(user.currentTeamId)
    if (!team.stripeSubscriptionId) {
      return response.badRequest({ message: 'Aucun abonnement actif.' })
    }

    const payload = await request.validateUsing(cancelValidator)
    const resume = payload.resume === true

    try {
      await billingService.setCancelAtPeriodEnd(team.stripeSubscriptionId, !resume)
      team.subscriptionCancelAtPeriodEnd = !resume
      team.subscriptionCancelExternal = false
      await team.save()
      if (!resume) {
        await this.notifyCanceled(team)
      }
      return response.ok({
        message: resume ? 'Abonnement réactivé' : 'Abonnement programmé pour annulation',
        cancelAtPeriodEnd: !resume,
      })
    } catch {
      return response.badRequest({
        message: resume
          ? 'Impossible de réactiver l’abonnement. Réessayez ou passez par le portail Stripe.'
          : 'Impossible de résilier l’abonnement pour le moment. Réessayez plus tard.',
      })
    }
  }

  private async notifyCanceled(team: Team) {
    try {
      const owner = await User.find(team.ownerId)
      if (!owner?.email) return
      const endDate = team.subscriptionCurrentPeriodEnd
        ? team.subscriptionCurrentPeriodEnd.setLocale('fr').toLocaleString(DateTime.DATE_FULL)
        : 'la fin de la période en cours'
      await mail.sendLater(
        new SubscriptionCanceledNotification(
          owner.email,
          team.name,
          planLabel(team.plan),
          endDate,
          owner.fullName ?? undefined
        )
      )
    } catch {}
  }
}
