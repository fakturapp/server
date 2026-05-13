import vine from '@vinejs/vine'

export const confirmPrivateValidator = vine.compile(
  vine.object({
    teamId: vine.string().trim(),
    ackDataLoss: vine.boolean(),
    ackNotResponsible: vine.boolean(),
  })
)

export const migrateToStandardValidator = vine.compile(
  vine.object({
    teamId: vine.string().trim(),
    password: vine.string().minLength(1),
  })
)
