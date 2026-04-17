interface GeoResult {
  country: string
  countryName: string
  city: string
}

interface CacheEntry {
  data: GeoResult
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

const UNKNOWN_GEO: GeoResult = { country: '', countryName: '', city: '' }

export async function getGeoFromIp(ip: string): Promise<GeoResult> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return UNKNOWN_GEO
  }

  const cached = cache.get(ip)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  return UNKNOWN_GEO
}
