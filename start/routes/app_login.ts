import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_PREFIX } from '#start/routes/_prefix'

const Challenge = () => import('#controllers/auth/app_login/challenge')
const Device = () => import('#controllers/auth/app_login/device')
const Settings = () => import('#controllers/account/app_login/settings')

// Flux de login (public) : création + polling de l'approbation.
router.post(API_PREFIX + '/auth/login/app-challenge', [Challenge, 'create'])
router.get(API_PREFIX + '/auth/login/app-challenge/:challengeId', [Challenge, 'poll'])

// Côté appareil (app authentifiée).
router
  .group(() => {
    router.post('/auth/app-login/enable', [Device, 'enable'])
    router.get('/auth/app-login/pending', [Device, 'pending'])
    router.post('/auth/app-login/:id/respond', [Device, 'respond'])

    router.get('/account/app-login', [Settings, 'show'])
    router.put('/account/app-login/require-match', [Settings, 'updateRequireMatch'])
    router.delete('/account/app-login/devices/:id', [Settings, 'removeDevice'])
    router.delete('/account/app-login', [Settings, 'disable'])
  })
  .prefix(API_PREFIX)
  .use(middleware.auth())
