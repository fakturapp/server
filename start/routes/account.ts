import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_PREFIX } from '#start/routes/_prefix'

const ProfileShow = () => import('#controllers/account/profile/show')
const ProfileUpdate = () => import('#controllers/account/profile/update')
const UiThemeUpdate = () => import('#controllers/account/profile/update_ui_theme')
const UiBackgroundUpload = () => import('#controllers/account/profile/upload_ui_background')
const UiBackgroundDelete = () => import('#controllers/account/profile/delete_ui_background')
const AccountDelete = () => import('#controllers/account/profile/delete')
const DeletionStart = () => import('#controllers/account/delete/start')
const DeletionTeams = () => import('#controllers/account/delete/teams')
const DeletionResolveTeam = () => import('#controllers/account/delete/resolve_team')
const DeletionVerifyName = () => import('#controllers/account/delete/verify_name')
const DeletionSendCode = () => import('#controllers/account/delete/send_code')
const DeletionVerifyCode = () => import('#controllers/account/delete/verify_code')
const DeletionVerifyPassword = () => import('#controllers/account/delete/verify_password')
const DeletionConfirm = () => import('#controllers/account/delete/confirm')
const UploadAvatar = () => import('#controllers/account/profile/upload_avatar')
const ServeAvatar = () => import('#controllers/account/profile/serve_avatar')

const PasswordChange = () => import('#controllers/account/security/password')
const SecurityVerify = () => import('#controllers/account/security/security_verify')
const SecurityAppChallenge = () => import('#controllers/account/security/app_challenge')
const SessionRevoke = () => import('#controllers/account/security/revoke_session')
const SessionsList = () => import('#controllers/account/security/sessions')

const TwoFactorSetup = () => import('#controllers/account/two_factor/setup')
const TwoFactorEnable = () => import('#controllers/account/two_factor/enable')
const TwoFactorDisable = () => import('#controllers/account/two_factor/disable')

const EmailRequestChange = () => import('#controllers/account/email/email_request_change')
const EmailConfirmChange = () => import('#controllers/account/email/email_confirm_change')

const ListProviders = () => import('#controllers/account/providers/list')
const LinkProvider = () => import('#controllers/account/providers/link')
const UnlinkProvider = () => import('#controllers/account/providers/unlink')

const PasskeyRegisterOptions = () => import('#controllers/account/passkeys/register_options')
const PasskeyRegisterVerify = () => import('#controllers/account/passkeys/register_verify')
const PasskeyList = () => import('#controllers/account/passkeys/list')
const PasskeyDelete = () => import('#controllers/account/passkeys/delete')

const ListUserOauthApps = () => import('#controllers/account/oauth_apps/list')
const RevokeUserOauthApp = () => import('#controllers/account/oauth_apps/revoke_app')
const RevokeUserOauthSession = () => import('#controllers/account/oauth_apps/revoke_session')

const ApiUsageShow = () => import('#controllers/account/api_usage/show')

router.get(API_PREFIX + '/avatars/:filename', [ServeAvatar, 'handle'])

router
  .group(() => {
    router.get('/profile', [ProfileShow, 'handle'])
    router.put('/profile', [ProfileUpdate, 'handle'])
    router.put('/ui-theme', [UiThemeUpdate, 'handle'])
    router.post('/ui-background', [UiBackgroundUpload, 'handle'])
    router.delete('/ui-background', [UiBackgroundDelete, 'handle'])
    router.put('/password', [PasswordChange, 'handle']).use(middleware.securityVerified())
    router.post('/avatar', [UploadAvatar, 'handle'])
    router.get('/sessions', [SessionsList, 'handle'])
    router.delete('/sessions/:id', [SessionRevoke, 'handle'])
    router.delete('/', [AccountDelete, 'handle'])

    router.post('/delete/start', [DeletionStart, 'handle'])
    router.get('/delete/teams', [DeletionTeams, 'handle'])
    router.post('/delete/resolve-team', [DeletionResolveTeam, 'handle'])
    router.post('/delete/verify-name', [DeletionVerifyName, 'handle'])
    router.post('/delete/send-code', [DeletionSendCode, 'handle'])
    router.post('/delete/verify-code', [DeletionVerifyCode, 'handle'])
    router.post('/delete/verify-password', [DeletionVerifyPassword, 'handle'])
    router.delete('/delete/confirm', [DeletionConfirm, 'handle'])

    router.post('/2fa/setup', [TwoFactorSetup, 'handle']).use(middleware.securityVerified())
    router.post('/2fa/enable', [TwoFactorEnable, 'handle'])
    router.post('/2fa/disable', [TwoFactorDisable, 'handle']).use(middleware.securityVerified())

    router.post('/security/send-code', [SecurityVerify, 'sendCode'])
    router.post('/security/verify', [SecurityVerify, 'verify'])
    router.post('/security/app-challenge', [SecurityAppChallenge, 'create'])
    router.get('/security/app-challenge/:challengeId', [SecurityAppChallenge, 'poll'])

    router.post('/email/request-change', [EmailRequestChange, 'handle']).use(middleware.securityVerified())
    router.post('/email/confirm-change', [EmailConfirmChange, 'handle'])

    router.get('/providers', [ListProviders, 'handle'])
    router.post('/providers/link', [LinkProvider, 'handle']).use(middleware.securityVerified())
    router.post('/providers/unlink', [UnlinkProvider, 'handle']).use(middleware.securityVerified())

    router.post('/passkeys/register-options', [PasskeyRegisterOptions, 'handle'])
    router.post('/passkeys/register-verify', [PasskeyRegisterVerify, 'handle']).use(middleware.securityVerified())
    router.get('/passkeys', [PasskeyList, 'handle'])
    router.delete('/passkeys/:id', [PasskeyDelete, 'handle']).use(middleware.securityVerified())

    router.get('/oauth-apps', [ListUserOauthApps, 'handle'])
    router.post('/oauth-apps/:authorizationId/revoke', [RevokeUserOauthApp, 'handle'])
    router.post('/oauth-apps/sessions/:tokenId/revoke', [RevokeUserOauthSession, 'handle'])

    router.get('/api-usage', [ApiUsageShow, 'handle'])
  })
  .prefix(API_PREFIX + '/account')
  .use(middleware.auth())
