---
name: safepay
description: SafePay payment integration for BookMyBarber. Use when implementing checkout, webhooks, PKR payments, getsafepay, or replacing Stripe.
---

# SafePay — BookMyBarber

## Architecture (mandatory)

```
BookMyBarber-App / BookMyBarber-admin
    → HTTP /v1/payments/*  (Axios, src/lib/payments.ts)
    → BookMyBarber-bk
        → @sfpy/node-core  (SafePay API)
        → Supabase public.payments (getSupabaseSecret)
```

- **No Stripe.** No SafePay SDK or keys in client apps.
- Read `.cursor/rules/api-architecture.mdc` before changing payment flows.

## Credentials (`BookMyBarber-bk/.env` only)

| Variable | Purpose |
|----------|---------|
| `SAFEPAY_SECRET_KEY` | `sec_...` — SDK auth (`authType: 'secret'`) |
| `SAFEPAY_MERCHANT_API_KEY` | Public merchant key for `session.setup` |
| `SAFEPAY_ENV` | `sandbox` or `production` |
| `SAFEPAY_WEBHOOK_SECRET` | Header check on webhooks |
| `SAFEPAY_REDIRECT_URL` | Post-payment redirect |
| `SAFEPAY_CANCEL_URL` | Cancel redirect |

**Hosts:** sandbox `https://sandbox.api.getsafepay.com` · production `https://api.getsafepay.com`

## SDK (`@sfpy/node-core` v0.3.x)

```typescript
import Safepay from "@sfpy/node-core";
const client = new Safepay(process.env.SAFEPAY_SECRET_KEY!, {
  authType: "secret",
  host: "https://sandbox.api.getsafepay.com",
});
```

Use helpers in `BookMyBarber-bk/src/config/safepay.ts` → `getSafepayClient()`.

## Express Hosted Checkout sequence

1. `client.payments.session.setup` — `merchant_api_key`, `intent: "CYBERSOURCE"`, `mode: "payment"`, `currency: "PKR"`, `amount` (paisa)
2. `client.client.passport.create()` → `tbt` token
3. `client.checkout.createCheckoutUrl({ env, tbt, tracker, source, redirect_url, cancel_url })`
4. Return `checkoutUrl` + `trackerToken` to client
5. Client opens URL (browser / WebView)
6. Webhook `POST /v1/webhooks/safepay` updates `payments.status`
7. Client polls `GET /v1/payments/:tracker`

## PKR amounts

- Client sends **rupees** (`amountPkr: 500` = Rs 500).
- SafePay API expects **lowest denomination** (paisa): `500 * 100 = 50000`.
- DB `payments.amount_pkr` stores paisa (integer).

## Backend routes

| Method | Path | RBAC |
|--------|------|------|
| POST | `/v1/payments/checkout` | `customer` |
| GET | `/v1/payments/:tracker` | `customer`, `barber`, `admin` |
| POST | `/v1/webhooks/safepay` | Public |

## Webhooks

- Events: `payment.succeeded`, `payment.failed` (see SafePay docs).
- Handler re-fetches tracker via `reporter.payments.fetch` — paid when `state === "TRACKER_ENDED"`.
- Optional header: `x-safepay-signature` or `x-webhook-secret` must match `SAFEPAY_WEBHOOK_SECRET`.
- Register URL in SafePay dashboard (use ngrok/tunnel for local dev).

## Mobile (Expo)

- Pass `source: "mobile"` to checkout.
- Open `checkoutUrl` in WebView; watch paths:
  - Success: `/external/complete`
  - Cancel: `/external/error`

## Client API (`src/lib/payments.ts`)

```typescript
import { createCheckout, getPaymentStatus } from "./payments";
const { checkoutUrl, trackerToken } = await createCheckout({ amountPkr: 500, source: "mobile" });
const { payment } = await getPaymentStatus(trackerToken);
```

## Database

Migration: `BookMyBarber-bk/supabase/migrations/20250521100000_payments.sql`

Table `public.payments` — RLS on, no client policies; backend service role only.

## Test

- Sandbox dashboard: https://sandbox.api.getsafepay.com/dashboard/login
- Test cards: https://safepay-docs.netlify.app/developers/safepay/test-cards

## Links

- Docs: https://safepay-docs.netlify.app/
- API reference: https://apidocs.getsafepay.com/
- Express checkout: https://safepay-docs.netlify.app/build-your-integration/express-checkout/
- SDK: https://github.com/getsafepay/node-core

## Implementation checklist

- [ ] Remove `stripe` from `BookMyBarber-bk`
- [ ] Install `@sfpy/node-core`
- [ ] Set all `SAFEPAY_*` env vars
- [ ] Apply `payments` migration in Supabase
- [ ] Register webhook URL in SafePay dashboard
- [ ] E2E: checkout → test card → webhook → `GET /v1/payments/:tracker` = `paid`

## Key files

- `BookMyBarber-bk/src/config/safepay.ts`
- `BookMyBarber-bk/src/services/safepay.service.ts`
- `BookMyBarber-bk/src/services/payment.service.ts`
- `BookMyBarber-bk/src/routes/v1/payments/index.ts`
- `BookMyBarber-bk/src/routes/v1/webhooks/safepay.ts`
