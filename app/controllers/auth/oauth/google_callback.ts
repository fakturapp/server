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
import { setAuthSessionCookies } from '#services/auth/auth_cookie_service'

function buildFrontendRedirect(frontendUrl: string, path: string): string {
  return new URL(path.startsWith('/') ? path : `/${path}`, frontendUrl).toString()
}

function sanitizeReturnTo(value: string | undefined | null): string {
  if (!value || typeof value !== 'string' || !value.startsWith('/')) {
    return '/dashboard'
  }
  return value
}

export default class GoogleCallback {
  async handle({ request, response }: HttpContext) {
    const code = request.input('code')
    const stateParam = request.input('state')
    const error = request.input('error')

    const frontendUrl = env.get('FRONTEND_URL', 'http://localhost:3000')

    if (error || !code || !stateParam) {
      return response.redirect(`${frontendUrl}/login?error=oauth_cancelled`)
    }

    let state: { intent: string; userId?: string; returnTo?: string; ts: number }
    try {
      state = JSON.parse(EncryptionService.decrypt(stateParam))
    } catch {
      return response.redirect(`${frontendUrl}/login?error=invalid_state`)
    }

    let profile
    try {
      profile = await GoogleAuthService.exchangeCodeForProfile(code)
    } catch {
      const errorRedirect =
        state.intent === 'link'
          ? `${frontendUrl}/oauth/callback?error=oauth_failed`
          : `${frontendUrl}/login?error=oauth_failed`
      return response.redirect(errorRedirect)
    }

    if (state.intent === 'link' && state.userId) {
      return this.handleLink(request, response, frontendUrl, state.userId, profile)
    }

    return this.handleLogin(
      request,
      response,
      frontendUrl,
      sanitizeReturnTo(state.returnTo),
      profile
    )
  }

  private async handleLink(
    request: HttpContext['request'],
    response: HttpContext['response'],
    frontendUrl: string,
    userId: string,
    profile: { sub: string; email: string; name: string | null; picture: string | null }
  ) {
    const user = await User.find(userId)
    if (!user) {
      return response.redirect(`${frontendUrl}/oauth/callback?error=user_not_found`)
    }

    const existingProvider = await AuthProvider.query()
      .where('provider', 'google')
      .where('providerUserId', profile.sub)
      .first()

    if (existingProvider) {
      if (existingProvider.userId === userId) {
        return response.redirect(`${frontendUrl}/oauth/callback?success=true`)
      }
      return response.redirect(`${frontendUrl}/oauth/callback?error=already_linked`)
    }

    const userProvider = await AuthProvider.query()
      .where('userId', userId)
      .where('provider', 'google')
      .first()

    if (userProvider) {
      return response.redirect(`${frontendUrl}/oauth/callback?error=provider_exists`)
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
      ipAddress: request.ip(),
      userAgent: request.header('user-agent'),
      severity: 'info',
    })

    return response.redirect(`${frontendUrl}/oauth/callback?success=true`)
  }

  private async handleLogin(
    request: HttpContext['request'],
    response: HttpContext['response'],
    frontendUrl: string,
    returnTo: string,
    profile: { sub: string; email: string; name: string | null; picture: string | null }
  ) {
    const existingProvider = await AuthProvider.query()
      .where('provider', 'google')
      .where('providerUserId', profile.sub)
      .first()

    if (existingProvider) {
      const user = await User.find(existingProvider.userId)
      if (!user || user.status !== 'active') {
        return response.redirect(`${frontendUrl}/login?error=account_inactive`)
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
          ip_address: request.ip(),
          user_agent: (request.header('user-agent') || '').slice(0, 512),
        })

      await LoginHistory.create({
        userId: user.id,
        tokenIdentifier: String(token.identifier),
        ipAddress: request.ip(),
        userAgent: request.header('user-agent') ?? undefined,
        status: 'success',
        isSuspicious: false,
      })

      await AuditLog.create({
        userId: user.id,
        action: 'user.login.google',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress: request.ip(),
        userAgent: request.header('user-agent'),
        severity: 'info',
      })

      const tokenValue = token.value!.release()
      setAuthSessionCookies(response, {
        authToken: tokenValue,
        authTtlSeconds: 15 * 24 * 60 * 60,
      })

      return response.redirect(buildFrontendRedirect(frontendUrl, returnTo))
    }

    const existingUser = await User.findBy('email', profile.email)
    if (existingUser) {
      return response.redirect(
        buildFrontendRedirect(
          frontendUrl,
          `/login?error=email_exists&redirect=${encodeURIComponent(returnTo)}`
        )
      )
    }

    const encryptedProfile = GoogleAuthService.encryptProfileData(profile)
    return response.redirect(
      buildFrontendRedirect(
        frontendUrl,
        `/register?google_data=${encodeURIComponent(encryptedProfile)}&redirect=${encodeURIComponent(returnTo)}`
      )
    )
  }
}
