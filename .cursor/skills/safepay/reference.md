# SafePay API reference (BookMyBarber)

## session.setup payload

```json
{
  "merchant_api_key": "YOUR_MERCHANT_API_KEY",
  "user": "cus_optional_customer_token",
  "intent": "CYBERSOURCE",
  "mode": "payment",
  "entry_mode": "raw",
  "currency": "PKR",
  "amount": 50000,
  "metadata": { "booking_id": "uuid" },
  "include_fees": false
}
```

## createCheckoutUrl params

```typescript
{
  env: "sandbox" | "production",
  tbt: string,           // passport token
  tracker: string,       // tracker.token from session
  source: "hosted" | "mobile" | "popup",
  redirect_url: string,
  cancel_url: string,
  user_id?: string,
  order_id?: string,
}
```

## Tracker states

- `TRACKER_STARTED` — in progress
- `TRACKER_ENDED` — payment successful
- Other states — see https://safepay-docs.netlify.app/concepts/tracker-states

## Webhook payload (typical)

Extract `tracker` from `body.tracker`, `body.data.tracker`, or `body.data.tracker.token`.

Always confirm with `reporter.payments.fetch(tracker)` before marking DB `paid`.

## Stripe removal note

BookMyBarber never shipped Stripe runtime code. SafePay replaced:

- `stripe` npm package
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` env vars
