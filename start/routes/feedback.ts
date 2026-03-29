import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_PREFIX } from '#start/routes/_prefix'

const CreateFeedback = () => import('#controllers/feedback/create')
const MyFeedback = () => import('#controllers/feedback/mine')
const CreateBugReport = () => import('#controllers/bug_report/create')

router
  .group(() => {
    router.post('/feedback', [CreateFeedback, 'handle'])
    router.get('/feedback/mine', [MyFeedback, 'handle'])
    router.post('/bug-report', [CreateBugReport, 'handle'])
  })
  .use(middleware.auth())
  .prefix(API_PREFIX)
