import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Client from '#models/client/client'
import { decryptModelFieldsArray, ENCRYPTED_FIELDS } from '#services/crypto/field_encryption_helper'
import ClientTransformer from '#transformers/client_transformer'
import { ApiError } from '#exceptions/api_error'

const PAID_STATUSES = ['paid', 'paid_unconfirmed']

export default class List {
  async handle(ctx: HttpContext) {
    const { auth } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId
    const dek: Buffer = (ctx as any).dek

    if (!teamId) {
      throw new ApiError('team_not_selected')
    }

    const clients = await Client.query().where('team_id', teamId).orderBy('created_at', 'desc')

    decryptModelFieldsArray(clients, [...ENCRYPTED_FIELDS.client], dek)

    const clientIds = clients.map((c) => c.id)

    const [invoiceAggregates, quoteAggregates] = await Promise.all([
      clientIds.length > 0
        ? db
            .from('invoices')
            .where('team_id', teamId)
            .whereIn('client_id', clientIds)
            .groupBy('client_id')
            .select(
              'client_id',
              db.raw('COUNT(*)::int as count'),
              db.raw(
                "COALESCE(SUM(CASE WHEN status IN (?, ?) THEN total ELSE 0 END), 0)::float as revenue",
                PAID_STATUSES
              )
            )
        : Promise.resolve([]),
      clientIds.length > 0
        ? db
            .from('quotes')
            .where('team_id', teamId)
            .whereIn('client_id', clientIds)
            .groupBy('client_id')
            .select('client_id', db.raw('COUNT(*)::int as count'))
        : Promise.resolve([]),
    ])

    const invoiceMap = new Map<string, { count: number; revenue: number }>()
    for (const row of invoiceAggregates as Array<{ client_id: string; count: number; revenue: number }>) {
      invoiceMap.set(row.client_id, {
        count: Number(row.count ?? 0),
        revenue: Number(row.revenue ?? 0),
      })
    }

    const quoteMap = new Map<string, number>()
    for (const row of quoteAggregates as Array<{ client_id: string; count: number }>) {
      quoteMap.set(row.client_id, Number(row.count ?? 0))
    }

    const baseItems = await ctx.serialize.withoutWrapping(ClientTransformer.transform(clients))

    const clientsWithStats = (baseItems as Array<Record<string, unknown> & { id: string }>).map((item) => {
      const inv = invoiceMap.get(item.id) ?? { count: 0, revenue: 0 }
      return {
        ...item,
        invoiceCount: inv.count,
        quoteCount: quoteMap.get(item.id) ?? 0,
        totalRevenue: inv.revenue,
      }
    })

    return ctx.response.ok({ clients: clientsWithStats })
  }
}
