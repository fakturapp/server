import { BaseCommand, flags } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Registers (idempotently) the first-party OAuth client used by the
 * official Faktur iOS app. Public client (kind=mobile, PKCE enforced,
 * no client secret needed) with a custom-scheme redirect.
 *
 *   node ace oauth:create-mobile-app [--owner you@example.com]
 */
export default class OauthCreateMobileApp extends BaseCommand {
  static commandName = 'oauth:create-mobile-app'
  static description = 'Create or update the first-party OAuth client for the Faktur iOS app.'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.string({
    description: 'Email of the user that owns the app (defaults to the oldest account)',
  })
  declare owner?: string

  async run() {
    const { default: OauthApp } = await import('#models/oauth/oauth_app')
    const { default: oauthAppService } = await import('#services/oauth/oauth_app_service')
    const { default: User } = await import('#models/account/user')

    const NAME = 'Faktur pour iOS'
    const REDIRECT_URI = 'faktur://oauth-callback'
    const SCOPES = ['profile', 'offline_access']

    const existing = await OauthApp.query()
      .where('kind', 'mobile')
      .where('is_first_party', true)
      .where('name', NAME)
      .first()

    if (existing) {
      let dirty = false
      if (!existing.redirectUris.includes(REDIRECT_URI)) {
        existing.redirectUris = [...existing.redirectUris, REDIRECT_URI]
        dirty = true
      }
      const missingScopes = SCOPES.filter((s) => !existing.scopes.includes(s))
      if (missingScopes.length > 0) {
        existing.scopes = [...existing.scopes, ...missingScopes]
        dirty = true
      }
      if (!existing.isActive) {
        existing.isActive = true
        dirty = true
      }
      if (dirty) await existing.save()
      this.logger.info(`OAuth app already registered — client_id: ${existing.clientId}`)
      return
    }

    let ownerUser: InstanceType<typeof User> | null
    if (this.owner) {
      ownerUser = await User.findBy('email', this.owner)
      if (!ownerUser) {
        this.logger.error(`No user found with email ${this.owner}`)
        this.exitCode = 1
        return
      }
    } else {
      ownerUser = await User.query().orderBy('created_at', 'asc').first()
      if (!ownerUser) {
        this.logger.error('No user in database — create an account first or pass --owner')
        this.exitCode = 1
        return
      }
    }

    const { app } = await oauthAppService.create({
      name: NAME,
      description: 'Application mobile officielle Faktur pour iPhone.',
      redirectUris: [REDIRECT_URI],
      scopes: SCOPES,
      kind: 'mobile',
      createdByUserId: ownerUser.id,
      isFirstParty: true,
    })

    this.logger.info(`OAuth app created — client_id: ${app.clientId}`)
    this.logger.info('Reportez ce client_id dans la config iOS (clé Info.plist FakturOAuthClientID).')
  }
}
