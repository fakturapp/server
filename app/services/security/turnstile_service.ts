import env from '#start/env'

export default class TurnstileService {
  static async verifyToken(token: string, ip: string): Promise<boolean> {
    const enabled = env.get('CAPTCHA_ENABLED', false)
    if (!enabled) {
      return true
    }

    const secret = env.get('CLOUDFLARE_TURNSTILE_SECRET_KEY', '')
    if (!secret) {
      return true
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: ip,
      }),
    })

    const data = (await response.json()) as { success: boolean }
    return data.success
  }
}
