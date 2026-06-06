import InvoiceSetting from '#models/team/invoice_setting'
import InvoiceCustomizationSnapshot from '#models/team/invoice_customization_snapshot'
import {
  extractAppearance,
  resetAppearance,
  isCustomized,
  type InvoiceAppearance,
} from '#services/settings/invoice_appearance'

const MAX_SNAPSHOTS = 20

export async function snapshotAndResetInvoiceCustomization(teamId: string): Promise<void> {
  const settings = await InvoiceSetting.findBy('teamId', teamId)
  if (!settings || !isCustomized(settings)) return

  await InvoiceCustomizationSnapshot.create({
    teamId,
    snapshot: JSON.stringify(extractAppearance(settings)),
  })

  resetAppearance(settings)
  await settings.save()

  const all = await InvoiceCustomizationSnapshot.query()
    .where('teamId', teamId)
    .orderBy('createdAt', 'desc')
  if (all.length > MAX_SNAPSHOTS) {
    for (const stale of all.slice(MAX_SNAPSHOTS)) {
      await stale.delete()
    }
  }
}

export function parseAppearance(snapshot: InvoiceCustomizationSnapshot): InvoiceAppearance | null {
  try {
    return JSON.parse(snapshot.snapshot) as InvoiceAppearance
  } catch {
    return null
  }
}
