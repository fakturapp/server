import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { API_PREFIX } from '#start/routes/_prefix'

const EInvoicingSubmit = () => import('#controllers/einvoicing/submit')
const SubmitInvoice = () => import('#controllers/einvoicing/submit_invoice')
const ValidateConnection = () => import('#controllers/einvoicing/validate_connection')
const CheckStatus = () => import('#controllers/einvoicing/check_status')
const ListSubmissions = () => import('#controllers/einvoicing/list_submissions')
const DirectoryLookup = () => import('#controllers/einvoicing/directory_lookup')
const SetupEReporting = () => import('#controllers/einvoicing/setup_ereporting')
const GetEReportingStatus = () => import('#controllers/einvoicing/get_ereporting_status')
const B2BRouterWebhook = () => import('#controllers/einvoicing/webhook')

router
  .group(() => {
    router.post('/submit/:id', [EInvoicingSubmit, 'handle'])
    router.post('/submit-invoice/:id', [SubmitInvoice, 'handle'])
    router.get('/validate-connection', [ValidateConnection, 'handle'])
    router.post('/status/:id', [CheckStatus, 'handle'])
    router.get('/submissions', [ListSubmissions, 'handle'])
    router.get('/directory', [DirectoryLookup, 'handle'])
    router.post('/ereporting/setup', [SetupEReporting, 'handle'])
    router.get('/ereporting/status', [GetEReportingStatus, 'handle'])
  })
  .prefix(API_PREFIX + '/einvoicing')
  .use(middleware.auth())
  .use(middleware.vault())
  .use(middleware.emailVerified())

router
  .post(API_PREFIX + '/webhooks/b2brouter', [B2BRouterWebhook, 'handle'])
