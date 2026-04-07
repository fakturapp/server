import env from '#start/env'

/**
 * Builds the public payment link URL for a given token.
 *
 * Strategy:
 * - When `CHECKOUT_URL` is configured to a value different from `FRONTEND_URL`,
 *   we assume a dedicated checkout subdomain (e.g. https://checkout.example.com)
 *   handled by the Next.js middleware. Use the short form `/<token>/pay` so the
 *   visible URL is clean.
 * - Otherwise we are sharing the dashboard host, so keep the legacy
 *   `/checkout/<token>/pay` path that maps directly to the Next.js route.
 */
export function buildCheckoutUrl(token: string): string {
  const checkoutUrl = env.get('CHECKOUT_URL')
  const frontendUrl = env.get('FRONTEND_URL') || 'http://localhost:3000'
  const base = checkoutUrl || frontendUrl

  const usingDedicatedCheckoutHost = !!checkoutUrl && checkoutUrl !== frontendUrl
  const path = usingDedicatedCheckoutHost ? `/${token}/pay` : `/checkout/${token}/pay`

  return `${base}${path}`
}
