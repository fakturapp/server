import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_PREFIX } from '#start/routes/_prefix'

const AdminFeedbacks = () => import('#controllers/admin/feedbacks')
const AdminBugReports = () => import('#controllers/admin/bug_reports')

// Admin routes
router
  .group(() => {
    router.get('/feedbacks', [AdminFeedbacks, 'handle'])
    router.get('/bug-reports', [AdminBugReports, 'index'])
    router.patch('/bug-reports/:id', [AdminBugReports, 'update'])
  })
  .use([middleware.auth(), middleware.admin()])
  .prefix(API_PREFIX + '/admin')
