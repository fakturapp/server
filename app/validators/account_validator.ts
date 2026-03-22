import vine from '@vinejs/vine'
import securityConfig from '#config/security'

export const emailChangeValidator = vine.compile(
  vine.object({
    newEmail: vine.string().email().trim().maxLength(254),
  })
)

export const securityVerifyValidator = vine.compile(
  vine.object({
    code: vine.string().trim(),
    method: vine.enum(['email', 'totp', 'recovery']).optional(),
  })
)

export const deleteAccountValidator = vine.compile(
  vine.object({
    password: vine.string(),
  })
)

export const updateProfileValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(255).optional(),
    avatarUrl: vine.string().trim().maxLength(500).optional(),
  })
)

export const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string(),
    password: vine
      .string()
      .minLength(securityConfig.password.minLength)
      .maxLength(128)
      .confirmed(),
  })
)
