import type InvoiceSetting from '#models/team/invoice_setting'

export const APPEARANCE_DEFAULTS = {
  template: 'classique',
  darkMode: false,
  accentColor: '#6366f1',
  documentFont: 'Lexend',
  logoBorderRadius: 0,
}

export type InvoiceAppearance = typeof APPEARANCE_DEFAULTS

export function extractAppearance(settings: InvoiceSetting): InvoiceAppearance {
  return {
    template: settings.template,
    darkMode: settings.darkMode,
    accentColor: settings.accentColor,
    documentFont: settings.documentFont,
    logoBorderRadius: settings.logoBorderRadius,
  }
}

export function applyAppearance(settings: InvoiceSetting, appearance: Partial<InvoiceAppearance>): void {
  if (typeof appearance.template === 'string') settings.template = appearance.template
  if (typeof appearance.darkMode === 'boolean') settings.darkMode = appearance.darkMode
  if (typeof appearance.accentColor === 'string') settings.accentColor = appearance.accentColor
  if (typeof appearance.documentFont === 'string') settings.documentFont = appearance.documentFont
  if (typeof appearance.logoBorderRadius === 'number') {
    settings.logoBorderRadius = appearance.logoBorderRadius
  }
}

export function resetAppearance(settings: InvoiceSetting): void {
  applyAppearance(settings, APPEARANCE_DEFAULTS)
}

export function isCustomized(settings: InvoiceSetting): boolean {
  return (
    settings.template !== APPEARANCE_DEFAULTS.template ||
    settings.darkMode !== APPEARANCE_DEFAULTS.darkMode ||
    settings.accentColor !== APPEARANCE_DEFAULTS.accentColor ||
    settings.documentFont !== APPEARANCE_DEFAULTS.documentFont ||
    settings.logoBorderRadius !== APPEARANCE_DEFAULTS.logoBorderRadius
  )
}
