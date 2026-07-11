# Iraq Payment Providers

The app now models these online payment services for checkout and admin review:

| Provider | Account required? | Production access needed |
| --- | --- | --- |
| FIB | Yes | FIB sandbox registration, integration request, then issued `client_id` and `client_secret`. |
| FastPay | Yes | FastPay merchant account from the Merchant Acquisition Team, then `storeId` and `storePassword`. |
| NASS | Yes | NASS partner onboarding before API credentials are issued. |
| ZainCash | Yes | ZainCash business request and onboarding, then production `client_id`, `client_secret`, and API key. |
| QiCard | Yes | Merchant Terminal ID and API credentials from the acquirer/QiCard before production payment creation. |

Provider secrets must stay on the backend. The client should only receive a server-created payment handoff such as a redirect URL, QR/app link, readable code, or payment status.

QiCard can be used for wallet top-ups after the backend creates a payment and receives a verified successful webhook or status response. Do not credit wallet balance from the browser/app redirect alone.

Sources reviewed on 2026-07-09:

- https://fib.iq/integrations/web-payments/
- https://fast-pay.iq/integrate-web
- https://nass.iq/resources/developers
- https://nass.iq/contact-us/become-a-partner
- https://docs.zaincash.iq/
- https://developers-gate.qi.iq/docs/api-endpoints/create-payment
- https://developers-gate.qi.iq/docs/getting-started/payment-gateway-intro
