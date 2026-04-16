import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_PREFIX } from '#start/routes/_prefix'

const GenerateText = () => import('#controllers/ai/generate_text')
const SuggestInvoiceLines = () => import('#controllers/ai/suggest_invoice_lines')
const DashboardSummary = () => import('#controllers/ai/dashboard_summary')
const GenerateReminder = () => import('#controllers/ai/generate_reminder')
const GenerateDocument = () => import('#controllers/ai/generate_document')
const ChatDocument = () => import('#controllers/ai/chat_document')
const CheckProviders = () => import('#controllers/ai/check_providers')
const AiQuota = () => import('#controllers/ai/ai_quota')

router
  .group(() => {
    router.post('/generate-text', [GenerateText, 'handle'])
    router.post('/suggest-invoice-lines', [SuggestInvoiceLines, 'handle'])
    router.get('/dashboard-summary', [DashboardSummary, 'handle'])
    router.post('/generate-reminder', [GenerateReminder, 'handle'])
    router.post('/generate-document', [GenerateDocument, 'handle'])
    router.post('/chat-document', [ChatDocument, 'handle'])
    router.get('/providers', [CheckProviders, 'handle'])
    router.get('/quota', [AiQuota, 'handle'])
  })
  .prefix(API_PREFIX + '/ai')
  .use(middleware.auth())
  .use(middleware.vault())
  .use(middleware.emailVerified())
