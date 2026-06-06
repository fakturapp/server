import InvoiceSetting from '#models/team/invoice_setting'
import InvoiceCustomizationSnapshot from '#models/team/invoice_customization_snapshot'
import {
  extractAppearance,
  resetAppearance,
  applyAppearance,
  isCustomized,
  type InvoiceAppearance,
} from '#services/settings/invoice_appearance'

export async function snapshotAndResetInvoiceCustomization(teamId: string): Promise<void> {
  const settings = await InvoiceSetting.findBy('teamId', teamId)
  if (!settings) return

  if (isCustomized(settings)) {
    await InvoiceCustomizationSnapshot.query().where('teamId', teamId).delete()
    await InvoiceCustomizationSnapshot.create({
      teamId,
      snapshot: JSON.stringify(extractAppearance(settings)),
    })
    resetAppearance(settings)
  }

  settings.aiEnabled = false
  await settings.save()
}

export async function restoreInvoiceCustomizationOnUpgrade(teamId: string): Promise<void> {
  const snapshot = await InvoiceCustomizationSnapshot.query()
    .where('teamId', teamId)
    .orderBy('createdAt', 'desc')
    .first()
  if (!snapshot) return

  const appearance = parseAppearance(snapshot)
  if (appearance) {
    const settings = await InvoiceSetting.findBy('teamId', teamId)
    if (settings) {
      applyAppearance(settings, appearance)
      await settings.save()
    }
  }

  await InvoiceCustomizationSnapshot.query().where('teamId', teamId).delete()
}

export function parseAppearance(snapshot: InvoiceCustomizationSnapshot): InvoiceAppearance | null {
  try {
    return JSON.parse(snapshot.snapshot) as InvoiceAppearance
  } catch {
    return null
  }
}
