import db from '@adonisjs/lucid/services/db'

export interface NumberGenerationOptions {
  teamId: string
  table: 'invoices' | 'quotes' | 'credit_notes'
  numberColumn: string
  pattern: string
  padding?: number
}

export async function resolvePatternPrefix(pattern: string): Promise<string> {
  const currentYear = new Date().getFullYear().toString()
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
  return pattern
    .replace('{annee}', currentYear)
    .replace('{year}', currentYear)
    .replace('{mois}', currentMonth)
    .replace('{month}', currentMonth)
    .replace('{numero}', '')
    .replace('{number}', '')
}

export async function generateNextNumber(options: NumberGenerationOptions): Promise<string> {
  const { teamId, table, numberColumn, pattern, padding = 3 } = options
  const prefix = await resolvePatternPrefix(pattern)

  const last = await db
    .from(table)
    .where('team_id', teamId)
    .where(numberColumn, 'like', `${prefix}%`)
    .orderBy('created_at', 'desc')
    .first()

  let nextNum = 1
  if (last) {
    const numStr = (last[numberColumn] as string).slice(prefix.length)
    const parsed = Number.parseInt(numStr, 10)
    if (!Number.isNaN(parsed)) nextNum = parsed + 1
  }

  return `${prefix}${nextNum.toString().padStart(padding, '0')}`
}
