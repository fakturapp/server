import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Client from '#models/client/client'
import { decryptModelFields, ENCRYPTED_FIELDS } from '#services/crypto/field_encryption_helper'
import { ApiError } from '#exceptions/api_error'

const PAID_STATUSES = ['paid', 'paid_unconfirmed']

export default class Show {
  async handle(ctx: HttpContext) {
    const { auth, params } = ctx
    const user = auth.user!
    const teamId = user.currentTeamId
    const dek: Buffer = (ctx as any).dek

    if (!teamId) {
      throw new ApiError('team_not_selected')
    }

    const client = await Client.query().where('id', params.id).where('team_id', teamId).first()

    if (!client) {
      throw new ApiError('client_not_found')
    }

    decryptModelFields(client, [...ENCRYPTED_FIELDS.client], dek)

    const [invoiceStats, quoteCountRow] = await Promise.all([
      db
        .from('invoices')
        .where('team_id', teamId)
        .where('client_id', client.id)
        .select(
          db.raw('COUNT(*)::int as count'),
          db.raw(
            "COALESCE(SUM(CASE WHEN status IN (?, ?) THEN total ELSE 0 END), 0)::float as revenue",
            PAID_STATUSES
          )
        )
        .first(),
      db
        .from('quotes')
        .where('team_id', teamId)
        .where('client_id', client.id)
        .count('* as count')
        .first(),
    ])

    const invoiceCount = Number(invoiceStats?.count ?? 0)
    const totalRevenue = Number(invoiceStats?.revenue ?? 0)
    const quoteCount = Number(quoteCountRow?.count ?? 0)

    return ctx.response.ok({
      client: {
        id: client.id,
        type: client.type,
        displayName: client.displayName,
        companyName: client.companyName,
        firstName: client.firstName,
        lastName: client.lastName,
        siren: client.siren,
        siret: client.siret,
        vatNumber: client.vatNumber,
        email: client.email,
        phone: client.phone,
        includeInEmails: client.includeInEmails,
        address: client.address,
        addressComplement: client.addressComplement,
        postalCode: client.postalCode,
        city: client.city,
        country: client.country,
        notes: client.notes,
        invoiceCount,
        quoteCount,
        totalRevenue,
        createdAt: client.createdAt.toISO(),
      },
    })
  }
}
