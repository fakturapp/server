import vine from '@vinejs/vine'

export const inviteValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
    role: vine.enum(['viewer', 'member', 'admin']),
  })
)
