import vine from '@vinejs/vine'

const TEAM_ROLES = ['super_admin', 'admin', 'member', 'viewer'] as const

export const inviteValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().optional(),
    userId: vine.string().trim().uuid().optional(),
    role: vine.enum(TEAM_ROLES),
  })
)
