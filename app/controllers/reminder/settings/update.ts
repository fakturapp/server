import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import PaymentReminderSetting from '#models/reminder/payment_reminder_setting'

const updateValidator = vine.compile(
  vine.object({
    enabled: vine.boolean(),
    daysBeforeDue: vine.number().min(1).max(90).optional().nullable(),
    daysAfterDue: vine.number().min(1).max(90).optional().nullable(),
    repeatIntervalDays: vine.number().min(1).max(90).optional().nullable(),
    emailSubjectTemplate: vine.string().trim().maxLength(500).optional().nullable(),
    emailBodyTemplate: vine.string().trim().maxLength(5000).optional().nullable(),
    autoSend: vine.boolean().optional(),
    emailAccountId: vine.string().trim().optional().nullable(),
  })
)

export default class Update {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const payload = await request.validateUsing(updateValidator)

    let settings = await PaymentReminderSetting.query().where('team_id', teamId).first()

    if (!settings) {
      settings = await PaymentReminderSetting.create({
        teamId,
        enabled: payload.enabled,
        daysBeforeDue: payload.daysBeforeDue ?? null,
        daysAfterDue: payload.daysAfterDue ?? null,
        repeatIntervalDays: payload.repeatIntervalDays ?? null,
        emailSubjectTemplate: payload.emailSubjectTemplate ?? null,
        emailBodyTemplate: payload.emailBodyTemplate ?? null,
        autoSend: payload.autoSend ?? false,
        emailAccountId: payload.emailAccountId ?? null,
      })
    } else {
      settings.merge({
        enabled: payload.enabled,
        daysBeforeDue: payload.daysBeforeDue ?? null,
        daysAfterDue: payload.daysAfterDue ?? null,
        repeatIntervalDays: payload.repeatIntervalDays ?? null,
        emailSubjectTemplate: payload.emailSubjectTemplate ?? null,
        emailBodyTemplate: payload.emailBodyTemplate ?? null,
        autoSend: payload.autoSend ?? false,
        emailAccountId: payload.emailAccountId ?? null,
      })
      await settings.save()
    }

    return response.ok({
      message: 'Reminder settings updated',
      reminderSettings: {
        enabled: settings.enabled,
        daysBeforeDue: settings.daysBeforeDue,
        daysAfterDue: settings.daysAfterDue,
        repeatIntervalDays: settings.repeatIntervalDays,
        emailSubjectTemplate: settings.emailSubjectTemplate,
        emailBodyTemplate: settings.emailBodyTemplate,
        autoSend: settings.autoSend,
        emailAccountId: settings.emailAccountId,
      },
    })
  }
}
