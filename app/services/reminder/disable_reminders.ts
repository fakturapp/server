import PaymentReminderSetting from '#models/reminder/payment_reminder_setting'

export async function disableRemindersForTeam(teamId: string): Promise<void> {
  const settings = await PaymentReminderSetting.findBy('teamId', teamId)
  if (settings && (settings.enabled || settings.autoSend)) {
    settings.enabled = false
    settings.autoSend = false
    await settings.save()
  }
}
