import type { HttpContext } from '@adonisjs/core/http'
import PaymentReminder from '#models/reminder/payment_reminder'

export default class ListReminders {
  async handle({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const reminders = await PaymentReminder.query()
      .where('team_id', teamId)
      .where('invoice_id', params.id)
      .orderBy('sent_at', 'desc')

    return response.ok({
      reminders: reminders.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        toEmail: r.toEmail,
        errorMessage: r.errorMessage,
        sentAt: r.sentAt.toISO(),
      })),
    })
  }
}
