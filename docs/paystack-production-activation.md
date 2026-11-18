# DREAMZ Fashion — Paystack production activation

Storefront: https://dreamzfashion.dreamz-gc.com
Merchant: DREAMZ FASHION KONCEPTZ AND SERVICES LTD (verify in Paystack before charging)
Webhook endpoint: https://dreamzfashion.dreamz-gc.com/api/webhooks/paystack
Return route: https://dreamzfashion.dreamz-gc.com/checkout/callback

## Netlify environment (production only)

- PAYSTACK_SECRET_KEY — **secret**, Functions/Runtime, never in source code
- PAYSTACK_PUBLIC_KEY — optional for hosted redirect flow; not used by the current app
- PAYSTACK_WEBHOOK_SECRET — recommended whsec_ secret from Paystack Developers > API Configuration, Functions/Runtime
- ONLINE_PAYMENTS_ENABLED — production value true at the owner's explicit request on 18 November 2026. Change to false and redeploy immediately if payment initiation/verification malfunctions.
- SITE_URL — canonical HTTPS storefront URL

Netlify site ID: 691e9c77-3613-4dd6-b18a-2ace117c6933

## Current release status

- Production Paystack secret/public credentials were configured in Netlify before activation.
- This release enables the storefront checkout gate and retains backend amount, currency and signature checks.
- Merchant legal identity, Paystack live approval, webhook registration/delivery and settlement were NOT independently verified by the GitHub or Netlify tooling.
- Do not claim a transaction was received until a legitimate purchase is verified at Paystack and the order shows paid.
- Rotate any secret key previously shared through chat, then replace its Netlify production secret.

## Live payment verification

1. Rotate any live Paystack API secret ever pasted into a chat or shared outside a secure secret manager. Replace it directly in Netlify; do not commit it, expose it to clients or send it by chat.
2. In Paystack, check the merchant business profile and settlement account. Fashion sales must settle to the legitimate DREAMZ Fashion merchant, not an unrelated HELP A DREAM initiative.
3. Add the HTTPS webhook endpoint in Paystack (Developers > API Configuration / Webhook Settings). Generate a webhook signing secret if supported, then add it as PAYSTACK_WEBHOOK_SECRET in Netlify. The app supports both new timestamped signed events and the older x-paystack-signature format.
4. Confirm the refund policy at https://dreamzfashion.dreamz-gc.com/returns and correct merchant contact details.
5. After verifying merchant identity, rotating the exposed API key and configuring the webhook, set ONLINE_PAYMENTS_ENABLED=true for a monitored controlled test window and redeploy. If any prior step is incomplete, keep it false.
6. Make a small controlled, authorised live test purchase from a real ready-to-wear product. Check that the charge is processed by Paystack, the correct merchant receives it, the exact amount/currency is logged, the Paystack callback confirms the order and the webhook is delivered successfully. Review refund ability with the merchant dashboard.
7. Test a custom item requiring a manual quote (must not be automatically charged), a deposit-eligible item and the remaining-balance payment workflow.
8. Keep ONLINE_PAYMENTS_ENABLED=true only if the controlled tests succeed; otherwise return it to false and redeploy. Monitor orders, webhooks and reconciliation.

## Security and customer safety

- Paystack initializes charges on the server, never the browser.
- Every callback verifies reference, exact amount and NGN currency against the original ledger before crediting an order.
- Webhooks validate the signature over the raw request body before touching the payment ledger; event handling is idempotent.
- Production payment switch applies server-side even when a client bypasses the UI.
- On trouble, set ONLINE_PAYMENTS_ENABLED=false and redeploy to return to WhatsApp order requests. Leave existing webhook processing enabled for previously successful charges.
- A successful deployment does not by itself prove Paystack merchant approval or end-to-end payments.
