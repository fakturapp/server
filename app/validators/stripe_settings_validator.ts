import vine from '@vinejs/vine'

export const saveStripeSettingsValidator = vine.compile(
  vine.object({
    publishableKey: vine.string().trim().minLength(10),
    secretKey: vine.string().trim().minLength(10),
    webhookSecret: vine.string().trim().minLength(10),
  })
)
