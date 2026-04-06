import router from '@adonisjs/core/services/router'

const StripeWebhook = () => import('#controllers/webhooks/stripe_webhook')

// Stripe webhook — no auth, no API prefix, Stripe verifies via signature
router.post('/webhooks/stripe', [StripeWebhook, 'handle'])
