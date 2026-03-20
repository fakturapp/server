import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_PREFIX } from '#start/routes/_prefix'

const GenerateText = () => import('#controllers/ai/generate_text')
const SuggestInvoiceLines = () => import('#controllers/ai/suggest_invoice_lines')
const DashboardSummary = () => import('#controllers/ai/dashboard_summary')
const GenerateReminder = () => import('#controllers/ai/generate_reminder')

router
  .group(() => {
    router.post('/generate-text', [GenerateText, 'handle'])
    router.post('/suggest-invoice-lines', [SuggestInvoiceLines, 'handle'])
    router.get('/dashboard-summary', [DashboardSummary, 'handle'])
    router.post('/generate-reminder', [GenerateReminder, 'handle'])
  })
  .prefix(API_PREFIX + '/ai')
  .use(middleware.auth())
  .use(middleware.vault())
