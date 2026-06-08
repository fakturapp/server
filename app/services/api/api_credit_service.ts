import { DateTime } from 'luxon'
import ApiCreditUsage from '#models/api/api_credit_usage'

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export interface CreditLimits {
  PER_MINUTE: number
  SESSION_HOURS: number
  PER_SESSION: number
  WEEKLY_DAYS: number
  PER_WEEK: number
}

const SESSION_HOURS = readPositiveInt('API_CREDITS_SESSION_HOURS', 5)
const WEEKLY_DAYS = readPositiveInt('API_CREDITS_WEEKLY_DAYS', 7)

export const CREDIT_LIMITS: CreditLimits = {
  PER_MINUTE: readPositiveInt('API_CREDITS_PER_MINUTE', 3),
  SESSION_HOURS,
  PER_SESSION: readPositiveInt('API_CREDITS_PER_SESSION', 100),
  WEEKLY_DAYS,
  PER_WEEK: readPositiveInt('API_CREDITS_PER_WEEK', 1000),
}

const PRO_LIMITS: CreditLimits = {
  PER_MINUTE: readPositiveInt('API_CREDITS_PRO_PER_MINUTE', 60),
  SESSION_HOURS,
  PER_SESSION: readPositiveInt('API_CREDITS_PRO_PER_SESSION', 2000),
  WEEKLY_DAYS,
  PER_WEEK: readPositiveInt('API_CREDITS_PRO_PER_WEEK', 25000),
}

const TEAM_LIMITS: CreditLimits = {
  PER_MINUTE: readPositiveInt('API_CREDITS_TEAM_PER_MINUTE', 120),
  SESSION_HOURS,
  PER_SESSION: readPositiveInt('API_CREDITS_TEAM_PER_SESSION', 30000),
  WEEKLY_DAYS,
  PER_WEEK: readPositiveInt('API_CREDITS_TEAM_PER_WEEK', 500000),
}

export function creditLimitsFor(plan: string | null | undefined): CreditLimits {
  if (plan === 'pro') return PRO_LIMITS
  if (plan === 'team') return TEAM_LIMITS
  return CREDIT_LIMITS
}

export type CreditCheckResult =
  | {
      ok: true
      session_remaining: number
      weekly_remaining: number
      minute_remaining: number
    }
  | {
      ok: false
      reason: 'rate_limit_minute' | 'quota_session' | 'quota_weekly'
      retry_after_seconds: number
    }

function isoDay(now: DateTime): DateTime {
  return now.toUTC().startOf('day')
}

function expired(startedAt: DateTime | null, now: DateTime, hours: number): boolean {
  if (!startedAt) return true
  return now.diff(startedAt, 'hours').hours >= hours
}

class ApiCreditService {
  async getOrCreateRow(
    teamId: string,
    userId: string | null,
    now: DateTime
  ): Promise<ApiCreditUsage> {
    const day = isoDay(now)

    const existing = await ApiCreditUsage.query()
      .where('teamId', teamId)
      .where('day', day.toSQLDate()!)
      .first()

    if (existing) return existing

    const row = await ApiCreditUsage.create({
      teamId,
      userId,
      day,
      weekStart: day,
      dailyCount: 0,
      weeklyCount: 0,
      lastMinuteAt: null,
      minuteCount: 0,
      sessionStartedAt: null,
      sessionCount: 0,
      weeklyStartedAt: null,
    })
    return row
  }

  async findActiveSession(
    teamId: string,
    now: DateTime
  ): Promise<{ startedAt: DateTime; count: number; row: ApiCreditUsage } | null> {
    const cutoff = now.minus({ hours: SESSION_HOURS })
    const recent = await ApiCreditUsage.query()
      .where('teamId', teamId)
      .whereNotNull('sessionStartedAt')
      .where('sessionStartedAt', '>=', cutoff.toSQL()!)
      .orderBy('sessionStartedAt', 'desc')
      .first()

    if (!recent || !recent.sessionStartedAt) return null
    if (expired(recent.sessionStartedAt, now, SESSION_HOURS)) return null

    return { startedAt: recent.sessionStartedAt, count: recent.sessionCount, row: recent }
  }

  async findActiveWeek(
    teamId: string,
    now: DateTime
  ): Promise<{ startedAt: DateTime; count: number; row: ApiCreditUsage } | null> {
    const cutoff = now.minus({ days: WEEKLY_DAYS })
    const recent = await ApiCreditUsage.query()
      .where('teamId', teamId)
      .whereNotNull('weeklyStartedAt')
      .where('weeklyStartedAt', '>=', cutoff.toSQL()!)
      .orderBy('weeklyStartedAt', 'desc')
      .first()

    if (!recent || !recent.weeklyStartedAt) return null
    if (expired(recent.weeklyStartedAt, now, WEEKLY_DAYS * 24)) return null

    return { startedAt: recent.weeklyStartedAt, count: recent.weeklyCount, row: recent }
  }

  async check(
    teamId: string,
    userId: string | null,
    plan: string | null | undefined,
    cost = 1
  ): Promise<CreditCheckResult> {
    const limits = creditLimitsFor(plan)
    const now = DateTime.utc()
    const row = await this.getOrCreateRow(teamId, userId, now)

    if (row.lastMinuteAt && now.diff(row.lastMinuteAt, 'seconds').seconds < 60) {
      if (row.minuteCount >= limits.PER_MINUTE) {
        const retry = Math.max(1, 60 - Math.floor(now.diff(row.lastMinuteAt, 'seconds').seconds))
        return { ok: false, reason: 'rate_limit_minute', retry_after_seconds: retry }
      }
    }

    const session = await this.findActiveSession(teamId, now)
    const sessionCount = session?.count ?? 0
    if (sessionCount + cost > limits.PER_SESSION) {
      const startedAt = session?.startedAt ?? now
      const expiresAt = startedAt.plus({ hours: limits.SESSION_HOURS })
      return {
        ok: false,
        reason: 'quota_session',
        retry_after_seconds: Math.max(1, Math.floor(expiresAt.diff(now, 'seconds').seconds)),
      }
    }

    const week = await this.findActiveWeek(teamId, now)
    const weeklyCount = week?.count ?? 0
    if (weeklyCount + cost > limits.PER_WEEK) {
      const startedAt = week?.startedAt ?? now
      const expiresAt = startedAt.plus({ days: limits.WEEKLY_DAYS })
      return {
        ok: false,
        reason: 'quota_weekly',
        retry_after_seconds: Math.max(1, Math.floor(expiresAt.diff(now, 'seconds').seconds)),
      }
    }

    return {
      ok: true,
      session_remaining: Math.max(0, limits.PER_SESSION - sessionCount),
      weekly_remaining: Math.max(0, limits.PER_WEEK - weeklyCount),
      minute_remaining: Math.max(
        0,
        limits.PER_MINUTE -
          (row.lastMinuteAt && now.diff(row.lastMinuteAt, 'seconds').seconds < 60
            ? row.minuteCount
            : 0)
      ),
    }
  }

  async charge(teamId: string, userId: string | null, cost = 1): Promise<void> {
    const now = DateTime.utc()
    const row = await this.getOrCreateRow(teamId, userId, now)

    const withinMinute = row.lastMinuteAt && now.diff(row.lastMinuteAt, 'seconds').seconds < 60
    row.minuteCount = withinMinute ? row.minuteCount + 1 : 1
    row.lastMinuteAt = now

    const activeSession = await this.findActiveSession(teamId, now)
    if (activeSession && activeSession.row.id === row.id) {
      row.sessionCount += cost
    } else if (activeSession) {
      activeSession.row.sessionCount += cost
      await activeSession.row.save()
    } else {
      row.sessionStartedAt = now
      row.sessionCount = cost
    }

    const activeWeek = await this.findActiveWeek(teamId, now)
    if (activeWeek && activeWeek.row.id === row.id) {
      row.weeklyCount += cost
    } else if (activeWeek) {
      activeWeek.row.weeklyCount += cost
      await activeWeek.row.save()
    } else {
      row.weeklyStartedAt = now
      row.weeklyCount = cost
    }

    row.dailyCount += cost
    if (userId && !row.userId) row.userId = userId
    await row.save()
  }

  async getUsage(
    teamId: string,
    plan: string | null | undefined
  ): Promise<{
    session: {
      used: number
      limit: number
      remaining: number
      started_at: string | null
      reset_at: string | null
      hours_window: number
      active: boolean
    }
    weekly: {
      used: number
      limit: number
      remaining: number
      started_at: string | null
      reset_at: string | null
      days_window: number
      active: boolean
    }
    per_minute: { limit: number }
  }> {
    const limits = creditLimitsFor(plan)
    const now = DateTime.utc()

    const session = await this.findActiveSession(teamId, now)
    const sessionStartedAt = session?.startedAt ?? null
    const sessionResetAt = sessionStartedAt
      ? sessionStartedAt.plus({ hours: limits.SESSION_HOURS })
      : null
    const sessionUsed = session?.count ?? 0

    const week = await this.findActiveWeek(teamId, now)
    const weekStartedAt = week?.startedAt ?? null
    const weekResetAt = weekStartedAt ? weekStartedAt.plus({ days: limits.WEEKLY_DAYS }) : null
    const weekUsed = week?.count ?? 0

    return {
      session: {
        used: sessionUsed,
        limit: limits.PER_SESSION,
        remaining: Math.max(0, limits.PER_SESSION - sessionUsed),
        started_at: sessionStartedAt ? sessionStartedAt.toISO() : null,
        reset_at: sessionResetAt ? sessionResetAt.toISO() : null,
        hours_window: limits.SESSION_HOURS,
        active: Boolean(sessionStartedAt),
      },
      weekly: {
        used: weekUsed,
        limit: limits.PER_WEEK,
        remaining: Math.max(0, limits.PER_WEEK - weekUsed),
        started_at: weekStartedAt ? weekStartedAt.toISO() : null,
        reset_at: weekResetAt ? weekResetAt.toISO() : null,
        days_window: limits.WEEKLY_DAYS,
        active: Boolean(weekStartedAt),
      },
      per_minute: { limit: limits.PER_MINUTE },
    }
  }
}

export default new ApiCreditService()
