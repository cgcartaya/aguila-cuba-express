# Clover payments

Per-store opt-in Hosted Checkout for store orders, pickup collection and customer-portal shipment payments. Existing Stripe configuration remains intact. Clover does not split a Stripe Connect application fee; platform billing remains separate. Existing card surcharge is preserved as a separate line.

## Setup

1. Apply `20261104193138_clover_hosted_checkout.sql` before deploying application code.
2. Open the store's admin Settings → Plataformas de pago → Clover.
3. Paste Merchant ID and the private Ecommerce token generated for **Hosted checkout**. Select production for the actual merchant or sandbox with sandbox credentials.
4. Copy the displayed webhook URL into Clover Settings → Ecommerce → Hosted Checkout → Webhook URL. Generate its Signing Secret, save Clover settings, then enter that secret in the SaaS. Leave dashboard Redirect URLs blank so per-session URLs apply. Leave customer information requirements disabled unless all required fields are supplied; this integration sends the recorded customer/sender name and Clover can collect additional details.
5. Save with Clover disabled first. Complete a sandbox payment, verify the signed webhook, order/shipment state, receipt and duplicate delivery. Then enable production with the production merchant's credentials and verify an authorized payment.

Credentials are stored in a separate RLS-protected table with access revoked from browser roles. Only store OWNER/ADMIN or SaaS super admin may configure via authenticated server routes. Secrets are never returned. Switching off does not discard in-flight webhook confirmations. Merchant/secret/environment changes are blocked while sessions are pending.

## Lifecycle and operations

Checkouts last 15 minutes; repeated requests reuse active sessions, a partial unique index prevents concurrent checkouts for the same target. API timeouts are not blindly retried. Abandoned sessions are expired lazily on the next attempt; inventory stays reserved on the existing unpaid order, rather than being released without a definitive Clover payment status. No GET session-status API is available from Clover. Review abandoned orders through existing order management.

Only signed PAYMENT/APPROVED events for the configured merchant and a recorded session are accepted. Signature uses HMAC-SHA256 of timestamp + '.' + raw body, a 5-minute tolerance and timing-safe comparison. Declines do not mark orders paid. Browser redirects never settle a payment. Atomic database settlement locks both session and target, creates one shipment receipt and makes webhook retries idempotent. Paid events arriving after a balance change, manual payment, deletion or inventory restoration go to review without overwriting the target; Settings displays those exceptions with Clover payment references. Reconcile/refund in Clover as needed. Refund processing is manual in this release.

## Verification

`node --test tests/clover-payments.test.mjs` covers raw signature validation, tampering/replay, amounts, surcharge, credentials, reuse and invalid requests. `npx tsc --noEmit` checks types. A real or sandbox end-to-end payment requires merchant credentials and webhook configuration; mocked tests cannot establish merchant activation or payment processing eligibility.

Official references: https://docs.clover.com/dev/docs/creating-a-hosted-checkout-session, https://docs.clover.com/dev/docs/ecomm-hosted-checkout-webhook, https://docs.clover.com/dev/docs/redirecting-customers.
