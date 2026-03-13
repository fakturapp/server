/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

// Auth controllers (lazy imports)
const LoginController = () => import('#controllers/auth/login_controller')
const SignupController = () => import('#controllers/auth/signup_controller')
const LogoutController = () => import('#controllers/auth/logout_controller')
const MeController = () => import('#controllers/auth/me_controller')
const VerifyEmailController = () => import('#controllers/auth/verify_email_controller')
const ResendVerificationController = () =>
  import('#controllers/auth/resend_verification_controller')
const PasswordResetRequestController = () =>
  import('#controllers/auth/password_reset_request_controller')
const PasswordResetController = () => import('#controllers/auth/password_reset_controller')
const TwoFactorVerifyController = () => import('#controllers/auth/two_factor_verify_controller')
const TwoFactorSetupController = () => import('#controllers/auth/two_factor_setup_controller')

// Account controllers
const ProfileController = () => import('#controllers/profile_controller')

router.get('/', () => {
  return { name: 'ZenVoice API', version: '1.0.0', status: 'ok' }
})

router
  .group(() => {
    // Public auth routes
    router
      .group(() => {
        router.post('/signup', [SignupController, 'handle'])
        router.post('/login', [LoginController, 'handle'])
        router.post('/login/2fa', [TwoFactorVerifyController, 'handle'])

        // Email verification
        router.post('/verify-email', [VerifyEmailController, 'handle'])
        router.post('/resend-verification', [ResendVerificationController, 'handle'])

        // Password reset
        router.post('/password/forgot', [PasswordResetRequestController, 'handle'])
        router.post('/password/reset', [PasswordResetController, 'handle'])

        // Protected auth routes
        router
          .group(() => {
            router.post('/logout', [LogoutController, 'handle'])
            router.get('/me', [MeController, 'handle'])
          })
          .use(middleware.auth())
      })
      .prefix('auth')

    // Account routes (protected)
    router
      .group(() => {
        router.get('/profile', [ProfileController, 'show'])

        // 2FA management
        router.post('/2fa/setup', [TwoFactorSetupController, 'setup'])
        router.post('/2fa/confirm', [TwoFactorSetupController, 'confirm'])
        router.post('/2fa/disable', [TwoFactorSetupController, 'disable'])
      })
      .prefix('account')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
