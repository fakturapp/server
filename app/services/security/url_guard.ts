const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(IPV4_REGEX)
  if (!match) return false
  const octets = match.slice(1, 5).map((o) => Number(o))
  if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return true
  const [a, b] = octets
  if (a === 127) return true
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true
  if (a === 0) return true
  return false
}

function isPrivateIpv6(hostname: string): boolean {
  let host = hostname
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1)
  }
  const lower = host.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower.startsWith('fe80:')) return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true
  return false
}

export function isPublicHttpUrl(raw: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return false
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  const hostname = parsed.hostname.toLowerCase()
  if (!hostname) return false

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false

  if (hostname.includes(':') || hostname.startsWith('[')) {
    return !isPrivateIpv6(hostname)
  }

  if (IPV4_REGEX.test(hostname)) {
    return !isPrivateIpv4(hostname)
  }

  if (!hostname.includes('.')) return false

  return true
}
