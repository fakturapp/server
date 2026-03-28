import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_PREFIX } from '#start/routes/_prefix'

const AdminFeedbacks = () => import('#controllers/admin/feedbacks')
const AdminBugReports = () => import('#controllers/admin/bug_reports')
const CreateFeedback = () => import('#controllers/feedback/create')
const MyFeedback = () => import('#controllers/feedback/mine')
const CreateBugReport = () => import('#controllers/bug_report/create')

// User routes (auth only)
router
  .group(() => {
    router.post('/feedback', [CreateFeedback, 'handle'])
    router.get('/feedback/mine', [MyFeedback, 'handle'])
    router.post('/bug-report', [CreateBugReport, 'handle'])
  })
  .use(middleware.auth())
  .prefix(API_PREFIX)

// Admin routes
router
  .group(() => {
    router.get('/feedbacks', [AdminFeedbacks, 'handle'])
    router.get('/bug-reports', [AdminBugReports, 'index'])
    router.patch('/bug-reports/:id', [AdminBugReports, 'update'])
  })
  .use([middleware.auth(), middleware.admin()])
  .prefix(API_PREFIX + '/admin')
