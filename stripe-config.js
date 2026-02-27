// Stripe configuration
// Replace with your Stripe publishable key
// Get it from: Stripe Dashboard > Developers > API keys

const STRIPE_PUBLISHABLE_KEY = "pk_test_51T3R8e3P16MaTyvisApbihcETLnXNfmpjg3bxa0jKQwqiX1jUnlvxZxRJ7KGg1xRVOm3UjtPca9tkV4xvtT6fs0x00s2Ex8ntr";

// n8n endpoint used by the frontend to create checkout sessions.
const STRIPE_CHECKOUT_WEBHOOK_URL = "https://n8n.srv1426022.hstgr.cloud/webhook/create-checkout-session";

// Single recurring price for "all access" subscription.
// This ID must match the monthly Stripe product price you created.
const STRIPE_SUBSCRIPTION_PRICE_ID = "price_1T4NcJ3P16MaTyviw9JGGcjc";

// n8n endpoint for downloading personalized .rbz files with token
const N8N_DOWNLOAD_WEBHOOK_URL = "https://n8n.srv1426022.hstgr.cloud/webhook/generate-download-token";
