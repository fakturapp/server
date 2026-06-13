import http2 from 'node:http2'
import crypto from 'node:crypto'
import env from '#start/env'

export interface ApnsPayload {
  aps: {
    alert?: { title?: string; subtitle?: string; body?: string }
    badge?: number
    sound?: string
    'thread-id'?: string
    category?: string
    'interruption-level'?: 'passive' | 'active' | 'time-sensitive' | 'critical'
    'relevance-score'?: number
    'content-available'?: number
    'mutable-content'?: number
  }
  [key: string]: unknown
}

export interface ApnsResult {
  token: string
  ok: boolean
  status: number
  reason?: string
}

const HOSTS = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
}

class ApnsClient {
  private cachedJwt: { token: string; iat: number } | null = null

  get isConfigured(): boolean {
    return Boolean(
      env.get('APNS_KEY') &&
        env.get('APNS_KEY_ID') &&
        env.get('APNS_TEAM_ID') &&
        env.get('APNS_BUNDLE_ID')
    )
  }

  private get host(): string {
    return env.get('APNS_ENV') === 'production' ? HOSTS.production : HOSTS.sandbox
  }

  private get privateKeyPem(): string {
    const raw = String(env.get('APNS_KEY') ?? '')
    if (raw.includes('BEGIN PRIVATE KEY')) {
      return raw.replace(/\\n/g, '\n')
    }

    return Buffer.from(raw, 'base64').toString('utf8')
  }

  private buildJwt(): string {
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (this.cachedJwt && nowSeconds - this.cachedJwt.iat < 3000) {
      return this.cachedJwt.token
    }

    const header = { alg: 'ES256', kid: String(env.get('APNS_KEY_ID')) }
    const claims = { iss: String(env.get('APNS_TEAM_ID')), iat: nowSeconds }

    const encode = (object: unknown) =>
      Buffer.from(JSON.stringify(object)).toString('base64url')

    const signingInput = `${encode(header)}.${encode(claims)}`
    const signer = crypto.createSign('SHA256')
    signer.update(signingInput)
    const derSignature = signer.sign({ key: this.privateKeyPem, dsaEncoding: 'ieee-p1363' })
    const token = `${signingInput}.${derSignature.toString('base64url')}`

    this.cachedJwt = { token, iat: nowSeconds }
    return token
  }

  async send(token: string, payload: ApnsPayload, options?: { pushType?: string; priority?: number }): Promise<ApnsResult> {
    if (!this.isConfigured) {
      return { token, ok: false, status: 0, reason: 'APNsNotConfigured' }
    }

    const body = Buffer.from(JSON.stringify(payload))
    const client = http2.connect(this.host)

    return new Promise<ApnsResult>((resolve) => {
      let settled = false
      const finish = (result: ApnsResult) => {
        if (settled) return
        settled = true
        client.close()
        resolve(result)
      }

      client.on('error', () => finish({ token, ok: false, status: 0, reason: 'ConnectionError' }))

      const request = client.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        'authorization': `bearer ${this.buildJwt()}`,
        'apns-topic': String(env.get('APNS_BUNDLE_ID')),
        'apns-push-type': options?.pushType ?? 'alert',
        'apns-priority': String(options?.priority ?? 10),
        'content-type': 'application/json',
        'content-length': String(body.length),
      })

      let status = 0
      let responseBody = ''

      request.on('response', (headers) => {
        status = Number(headers[':status'] ?? 0)
      })
      request.setEncoding('utf8')
      request.on('data', (chunk) => {
        responseBody += chunk
      })
      request.on('end', () => {
        if (status === 200) {
          finish({ token, ok: true, status })
        } else {
          let reason: string | undefined
          try {
            reason = JSON.parse(responseBody)?.reason
          } catch {
            reason = undefined
          }
          finish({ token, ok: false, status, reason })
        }
      })
      request.on('error', () => finish({ token, ok: false, status: 0, reason: 'RequestError' }))

      request.end(body)
    })
  }
}

const apnsClient = new ApnsClient()
export default apnsClient
