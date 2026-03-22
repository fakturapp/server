import vine from '@vinejs/vine'

export const sendEmailValidator = vine.compile(
  vine.object({
    documentType: vine.enum(['invoice', 'quote', 'credit_note']),
    documentId: vine.string().trim(),
    emailAccountId: vine.string().trim(),
    to: vine.string().trim().email(),
    subject: vine.string().trim().minLength(1).maxLength(500),
    body: vine.string().trim().minLength(1),
    emailType: vine.enum(['send', 'reminder']).optional(),
  })
)

export const testEmailValidator = vine.compile(
  vine.object({
    emailAccountId: vine.string().trim(),
  })
)

export const configureResendValidator = vine.compile(
  vine.object({
    apiKey: vine.string().trim().minLength(10),
    fromEmail: vine.string().trim().email(),
    displayName: vine.string().trim().optional(),
  })
)

export const configureSmtpValidator = vine.compile(
  vine.object({
    host: vine.string().trim().minLength(1),
    port: vine.number().min(1).max(65535),
    username: vine.string().trim().minLength(1),
    password: vine.string().trim().minLength(1),
    fromEmail: vine.string().trim().email(),
    displayName: vine.string().trim().optional(),
  })
)

export const updateTemplateValidator = vine.compile(
  vine.object({
    templateType: vine.enum(['invoice_send', 'quote_send', 'credit_note_send']),
    subject: vine.string().trim().maxLength(500),
    body: vine.string().trim().maxLength(5000),
  })
)
