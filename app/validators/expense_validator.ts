import vine from '@vinejs/vine'

export const createExpenseValidator = vine.compile(
  vine.object({
    categoryId: vine.string().trim().optional(),
    description: vine.string().trim().maxLength(500),
    amount: vine.number().min(0),
    vatRate: vine.number().min(0).max(100).optional(),
    currency: vine.string().trim().maxLength(3).optional(),
    expenseDate: vine.string().trim(),
    paymentMethod: vine.string().trim().maxLength(50).optional(),
    supplier: vine.string().trim().maxLength(255).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
    receiptUrl: vine.string().trim().maxLength(500).optional(),
    isDeductible: vine.boolean().optional(),
  })
)

export const createExpenseCategoryValidator = vine.compile(
  vine.object({
    name: vine.string().trim().maxLength(100),
    color: vine
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  })
)
