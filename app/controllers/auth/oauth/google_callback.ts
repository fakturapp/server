import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/account/user'
import AuthProvider from '#models/account/auth_provider'
import LoginHistory from '#models/account/login_history'
import AuditLog from '#models/shared/audit_log'
import GoogleAuthService from '#services/auth/google_auth_service'
import EncryptionService from '#services/encryption/encryption_service'
import env from '#start/env'
import { realClientIp } from '#services/http/real_client_ip'
import { setAuthTokenCookie } from '#services/auth/auth_cookie'

export default class GoogleCallback {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const clientIp = realClientIp(ctx)
    const code = request.input('code')
    const stateParam = request.input('state')
    const error = request.input('error')

    const frontendUrl = env.get('FRONTEND_URL', 'http://localhost:3000')
    const accountUrl = env.get('ACCOUNT_URL') || frontendUrl

    if (error || !code || !stateParam) {
      return response.redirect(`${accountUrl}/login?error=oauth_cancelled`)
    }

    let state: { intent: string; userId?: string; returnTo?: string; ts: number }
    try {
      state = JSON.parse(EncryptionService.decrypt(stateParam))
    } catch {
      return response.redirect(`${accountUrl}/login?error=invalid_state`)
    }

    let profile
    try {
      profile = await GoogleAuthService.exchangeCodeForProfile(code)
    } catch {
      const errorRedirect =
        state.intent === 'link'
          ? `${accountUrl}/oauth/callback?error=oauth_failed`
          : `${accountUrl}/login?error=oauth_failed`
      return response.redirect(errorRedirect)
    }

    if (state.intent === 'link' && state.userId) {
      return this.handleLink(request, response, accountUrl, state.userId, profile, clientIp)
    }

    return this.handleLogin(request, response, accountUrl, profile, clientIp)
  }

  private async handleLink(
    request: HttpContext['request'],
    response: HttpContext['response'],
    accountUrl: string,
    userId: string,
    profile: { sub: string; email: string; name: string | null; picture: string | null },
    clientIp: string
  ) {
    const user = await User.find(userId)
    if (!user) {
      return response.redirect(`${accountUrl}/oauth/callback?error=user_not_found`)
    }

    const existingProvider = await AuthProvider.query()
      .where('provider', 'google')
      .where('providerUserId', profile.sub)
      .first()

    if (existingProvider) {
      if (existingProvider.userId === userId) {
        return response.redirect(`${accountUrl}/oauth/callback?success=true`)
      }
      return response.redirect(`${accountUrl}/oauth/callback?error=already_linked`)
    }

    const userProvider = await AuthProvider.query()
      .where('userId', userId)
      .where('provider', 'google')
      .first()

    if (userProvider) {
      return response.redirect(`${accountUrl}/oauth/callback?error=provider_exists`)
    }

    await AuthProvider.create({
      userId,
      provider: 'google',
      providerUserId: profile.sub,
      email: profile.email,
      displayName: profile.name,
      avatarUrl: profile.picture,
    })

    await AuditLog.create({
      userId,
      action: 'user.provider.linked',
      resourceType: 'auth_provider',
      metadata: { provider: 'google', email: profile.email },
      ipAddress: clientIp,
      userAgent: request.header('user-agent'),
      severity: 'info',
    })

    return response.redirect(`${accountUrl}/oauth/callback?success=true`)
  }

  private async handleLogin(
    request: HttpContext['request'],
    response: HttpContext['response'],
    accountUrl: string,
    profile: { sub: string; email: string; name: string | null; picture: string | null },
    clientIp: string
  ) {
    const existingProvider = await AuthProvider.query()
      .where('provider', 'google')
      .where('providerUserId', profile.sub)
      .first()

    if (existingProvider) {
      const user = await User.find(existingProvider.userId)
      if (!user || user.status !== 'active') {
        return response.redirect(`${accountUrl}/login?error=account_inactive`)
      }

      user.lastLoginAt = DateTime.now()
      await user.save()

      const token = await User.accessTokens.create(user, ['*'], {
        expiresIn: '15 days',
      })

      await db
        .from('auth_access_tokens')
        .where('id', String(token.identifier))
        .update({
          ip_address: clientIp,
          user_agent: (request.header('user-agent') || '').slice(0, 512),
        })

      await LoginHistory.create({
        userId: user.id,
        tokenIdentifier: String(token.identifier),
        ipAddress: clientIp,
        userAgent: request.header('user-agent') ?? undefined,
        status: 'success',
        isSuspicious: false,
      })

      await AuditLog.create({
        userId: user.id,
        action: 'user.login.google',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: clientIp,
        userAgent: request.header('user-agent'),
        severity: 'info',
      })

      const tokenValue = token.value!.release()
      setAuthTokenCookie(response, tokenValue)
      return response.redirect(`${accountUrl}/login?token=${encodeURIComponent(tokenValue)}`)
    }

    const existingUser = await User.findBy('email', profile.email)
    if (existingUser) {
      return response.redirect(`${accountUrl}/login?error=email_exists`)
    }

    const encryptedProfile = GoogleAuthService.encryptProfileData(profile)
    return response.redirect(
      `${accountUrl}/register?google_data=${encodeURIComponent(encryptedProfile)}`
    )
  }
}
