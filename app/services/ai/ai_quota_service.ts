import { DateTime } from 'luxon'
import AiUsageLog from '#models/ai/ai_usage_log'

const HOURLY_LIMIT = 5
const WEEKLY_LIMIT = 20

export interface QuotaStatus {
  hourly: {
    used: number
    limit: number
    resetsAt: string
  }
  weekly: {
    used: number
    limit: number
    resetsAt: string
  }
  allowed: boolean
}

export default class AiQuotaService {
  /**
   * Check if the team can make another AI request.
   */
  static async checkQuota(teamId: string): Promise<QuotaStatus> {
    const now = DateTime.now()

    // Hourly window: count requests in the last 60 minutes
    const hourAgo = now.minus({ hours: 1 })
    const hourlyUsed = await AiUsageLog.query()
      .where('teamId', teamId)
      .where('createdAt', '>=', hourAgo.toSQL()!)
      .count('* as total')
      .first()

    // Weekly window: from Monday 00:00 of current week
    const weekStart = now.startOf('week')
    const weeklyUsed = await AiUsageLog.query()
      .where('teamId', teamId)
      .where('createdAt', '>=', weekStart.toSQL()!)
      .count('* as total')
      .first()

    const hourlyCount = Number((hourlyUsed as any)?.$extras?.total || 0)
    const weeklyCount = Number((weeklyUsed as any)?.$extras?.total || 0)

    // Find the oldest request in the hourly window to determine when the quota resets
    let hourlyResetsAt = now.plus({ hours: 1 })
    if (hourlyCount >= HOURLY_LIMIT) {
      const oldest = await AiUsageLog.query()
        .where('teamId', teamId)
        .where('createdAt', '>=', hourAgo.toSQL()!)
        .orderBy('createdAt', 'asc')
        .first()
      if (oldest) {
        hourlyResetsAt = oldest.createdAt.plus({ hours: 1 })
      }
    }

    // Weekly resets at next Monday 00:00
    const weeklyResetsAt = weekStart.plus({ weeks: 1 })

    return {
      hourly: {
        used: hourlyCount,
        limit: HOURLY_LIMIT,
        resetsAt: hourlyResetsAt.toISO()!,
      },
      weekly: {
        used: weeklyCount,
        limit: WEEKLY_LIMIT,
        resetsAt: weeklyResetsAt.toISO()!,
      },
      allowed: hourlyCount < HOURLY_LIMIT && weeklyCount < WEEKLY_LIMIT,
    }
  }

  /**
   * Record an AI request for quota tracking.
   */
  static async recordUsage(teamId: string, userId: string, model: string, endpoint: string) {
    await AiUsageLog.create({ teamId, userId, model, endpoint })
  }
}
