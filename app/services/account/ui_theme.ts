export interface UiThemePayload {
  mode: 'light' | 'dark' | 'system'
  accent: string | null
  background: string | null
  backgroundIntensity: number
  customBackgroundUrl: string | null
  customBlur: number
  customDim: number
}

const MODES = ['light', 'dark', 'system']

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.round(num)))
}

export function normalizeUiTheme(parsed: unknown): UiThemePayload {
  const input = (parsed ?? {}) as Record<string, unknown>
  return {
    mode: MODES.includes(input.mode as string) ? (input.mode as UiThemePayload['mode']) : 'system',
    accent:
      typeof input.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(input.accent)
        ? input.accent
        : null,
    background:
      typeof input.background === 'string' && input.background.length <= 40
        ? input.background
        : null,
    backgroundIntensity: clampInt(input.backgroundIntensity, 20, 100, 100),
    customBackgroundUrl:
      typeof input.customBackgroundUrl === 'string' &&
      input.customBackgroundUrl.length > 0 &&
      input.customBackgroundUrl.length <= 600
        ? input.customBackgroundUrl
        : null,
    customBlur: clampInt(input.customBlur, 0, 40, 0),
    customDim: clampInt(input.customDim, 0, 80, 30),
  }
}

export function parseStoredUiTheme(raw: string | null): UiThemePayload {
  if (!raw) return normalizeUiTheme(null)
  try {
    return normalizeUiTheme(JSON.parse(raw))
  } catch {
    return normalizeUiTheme(null)
  }
}

export function serializeUiTheme(theme: UiThemePayload): string {
  return JSON.stringify(theme)
}
