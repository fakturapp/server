import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_PREFIX } from '#start/routes/_prefix'

const RegisterDevice = () => import('#controllers/push/register_device')
const UnregisterDevice = () => import('#controllers/push/unregister_device')
const NotificationPreferences = () => import('#controllers/push/notification_preferences')

router
  .group(() => {
    router.put('/devices', [RegisterDevice, 'handle'])
    router.delete('/devices/:token', [UnregisterDevice, 'handle'])

    router.get('/notification-preferences', [NotificationPreferences, 'index'])
    router.put('/notification-preferences', [NotificationPreferences, 'update'])
  })
  .prefix(API_PREFIX)
  .use(middleware.auth())
