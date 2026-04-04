import vine from '@vinejs/vine'

export const createShareValidator = vine.compile(
  vine.object({
    documentType: vine.enum(['invoice', 'quote', 'credit_note']),
    documentId: vine.string().trim().uuid(),
    email: vine.string().trim().email(),
    permission: vine.enum(['viewer', 'editor']),
  })
)

export const updateShareValidator = vine.compile(
  vine.object({
    permission: vine.enum(['viewer', 'editor']),
  })
)

export const createShareLinkValidator = vine.compile(
  vine.object({
    documentType: vine.enum(['invoice', 'quote', 'credit_note']),
    documentId: vine.string().trim().uuid(),
    permission: vine.enum(['viewer', 'editor']),
    visibility: vine.enum(['team', 'anyone']).optional(),
    autoExpire: vine.boolean().optional(),
  })
)

export const updateShareLinkValidator = vine.compile(
  vine.object({
    permission: vine.enum(['viewer', 'editor']).optional(),
    visibility: vine.enum(['team', 'anyone']).optional(),
    isActive: vine.boolean().optional(),
  })
)
