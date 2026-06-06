import type { HttpContext } from '@adonisjs/core/http'
import Team from '#models/team/team'
import InvoiceSetting from '#models/team/invoice_setting'
import InvoiceCustomizationSnapshot from '#models/team/invoice_customization_snapshot'
import { isPro } from '#services/billing/plan_entitlements'
import { applyAppearance } from '#services/settings/invoice_appearance'
import { parseAppearance } from '#services/settings/invoice_customization_snapshot_service'
import { serializeInvoiceSettings } from '#services/settings/serialize_invoice_settings'

export default class InvoiceCustomizationSnapshots {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    if (!user.currentTeamId) return response.notFound({ message: 'No team found' })

    const snapshots = await InvoiceCustomizationSnapshot.query()
      .where('teamId', user.currentTeamId)
      .orderBy('createdAt', 'desc')

    return response.ok({
      snapshots: snapshots.map((snapshot) => ({
        id: snapshot.id,
        appearance: parseAppearance(snapshot),
        createdAt: snapshot.createdAt?.toISO() ?? null,
      })),
    })
  }

  async restore({ auth, params, response }: HttpContext) {
    const user = auth.user!
    if (!user.currentTeamId) return response.notFound({ message: 'No team found' })

    const team = await Team.find(user.currentTeamId)
    if (!team) return response.notFound({ message: 'No team found' })

    if (!isPro(team)) {
      return response.forbidden({
        message: 'Faktur Pro est requis pour restaurer une personnalisation.',
        code: 'PRO_REQUIRED',
      })
    }

    const snapshot = await InvoiceCustomizationSnapshot.query()
      .where('id', params.id)
      .where('teamId', user.currentTeamId)
      .first()
    if (!snapshot) return response.notFound({ message: 'Sauvegarde introuvable' })

    const appearance = parseAppearance(snapshot)
    if (!appearance) return response.badRequest({ message: 'Sauvegarde invalide' })

    const settings = await InvoiceSetting.findBy('teamId', user.currentTeamId)
    if (!settings) return response.notFound({ message: 'Paramètres introuvables' })

    applyAppearance(settings, appearance)
    await settings.save()
    await snapshot.delete()

    return response.ok({
      message: 'Personnalisation restaurée',
      settings: serializeInvoiceSettings(settings),
    })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    if (!user.currentTeamId) return response.notFound({ message: 'No team found' })

    const snapshot = await InvoiceCustomizationSnapshot.query()
      .where('id', params.id)
      .where('teamId', user.currentTeamId)
      .first()
    if (snapshot) await snapshot.delete()

    return response.ok({ message: 'Sauvegarde supprimée' })
  }
}
