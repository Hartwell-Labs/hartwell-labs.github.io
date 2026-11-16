# Talus Partners

Affiliate backend for Talus, deployed from the main site repository on
`https://partners.hartwell-labs.pl`.

## Rules

- **20%** of the pre-tax amount actually collected.
- Commission is earned on the first payment and on every renewal.
- Commission is reversed proportionally when Stripe reports a refund.
- Affiliates request payouts from the dashboard at any time. Payouts are
  **manual**: the request is stored, the owner reviews it, then marks it paid.
- Dashboard links are bearer credentials. Only a SHA-256 hash is stored.
- Attribution is kept for 60 days in the buyer's browser and travels through
  Stripe as `client_reference_id` / `metadata.affiliate_code`.

## Dashboard URL

```
https://partners.hartwell-labs.pl/v1/dashboard?token=aff_...
```

The typo-compatible alias `/v1/dahboard?token=...` also works.

## Setup

1. Create the D1 database (already created for this project):

   ```bash
   npx wrangler d1 create talus-partners
   npx wrangler d1 execute talus-partners --remote --file=schema.sql
   ```

2. Set the Worker secrets:

   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   npx wrangler secret put PARTNERS_ADMIN_TOKEN
   npx wrangler secret put PARTNER_CLICK_SALT   # optional
   ```

3. Add a Stripe webhook endpoint:

   ```
   https://partners.hartwell-labs.pl/api/v1/webhook/stripe
   ```

   Events: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `invoice.paid`,
   `invoice.payment_succeeded`, `charge.refunded`.

   The existing license-server webhook stays in place; Stripe can deliver the
   same events to both endpoints. Fulfilment remains on the license server,
   commissions live here.

4. Deploy:

   ```bash
   npx wrangler deploy
   ```

   GitHub Actions also deploys on changes under `partners-worker/`.

## Create an affiliate

```bash
curl -X POST https://partners.hartwell-labs.pl/v1/admin/affiliates \
  -H "Authorization: Bearer $PARTNERS_ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"email":"creator@example.com","name":"Creator","payout_email":"paypal@example.com"}'
```

The response contains `dashboard_url` and `referral_url`. The dashboard token is
shown **once**; store or send it immediately. To rotate it:

```bash
curl -X POST https://partners.hartwell-labs.pl/v1/admin/affiliates/AFFILIATE_ID/token \
  -H "Authorization: Bearer $PARTNERS_ADMIN_TOKEN"
```

## Payouts

List open requests:

```bash
curl "https://partners.hartwell-labs.pl/v1/admin/payouts?status=requested" \
  -H "Authorization: Bearer $PARTNERS_ADMIN_TOKEN"
```

Mark one paid (or rejected):

```bash
curl -X POST https://partners.hartwell-labs.pl/v1/admin/payouts/12 \
  -H "Authorization: Bearer $PARTNERS_ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"status":"paid","note":"PayPal 2026-12-01"}'
```

Rejecting a request releases the reserved balance back to the affiliate.

## Notes

- The checkout endpoint is CORS-limited to `https://hartwell-labs.pl` and
  `https://www.hartwell-labs.pl`.
- Static Stripe Payment Links get `client_reference_id` from `assets/site.js`;
  the API checkout sends the code directly.
- A Stripe failure is surfaced to the buyer, who can fall back to the normal
  checkout. Attribution is best-effort at the edge; the webhook is the source
  of truth.
