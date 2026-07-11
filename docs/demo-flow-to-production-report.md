# Demo Flow to Production Report

Date: 2026-07-09

## Verdict

The app is still a demo/prototype flow, not a production application.

Most of the production-readiness analysis already exists in [docs/production-improvement-proposal.md](production-improvement-proposal.md). That document is the main report and already states the current verdict, P0 blockers, target architecture, 30-day remediation plan, delivery backlog, scorecard, scalability expectations, and verification performed.

This report is a shorter map of what is currently in the demo flow and what must change before production.

## What is in the current demo flow

| Area | Current demo behavior | Evidence |
|---|---|---|
| App entry point | The shipped app always renders the prototype app. | `App.tsx` imports and renders `PrototypeApp`. |
| Login | Users choose a mock role and verify with the hardcoded demo OTP `123456`. | `src/prototype/PrototypeApp.tsx` login flow. |
| Roles | Student, parent, teacher, and admin identities are client-side demo users. Admin is web-only. | `src/prototype/demoPlaybackEngine.ts` demo users and `PrototypeApp` role picker. |
| Commerce | Checkout supports wallet, coupon, manual payment, and online payment screens, but payment outcomes are simulated. | `PrototypeApp` checkout and admin payment review flow. |
| Coupon/voucher | `WELCOME12` is the successful demo coupon path; admin-generated voucher codes use demo code values. | `PrototypeApp` coupon and voucher UI. |
| Admin | Admin can manage content, payments, sessions, devices, notifications, audit logs, vouchers, and report export in the prototype UI. | `PrototypeApp` admin operations views. |
| Playback lock | One-active-playback behavior is modeled with device registration, lock TTL, heartbeat, force switch, risk events, and mock playback tokens. | `src/prototype/demoPlaybackEngine.ts`, `src/server/playback/*`, and `docs/playback-prototype-flows.md`. |
| Supabase path | There is a Supabase Edge Function for playback/device APIs, plus migrations for playback, wallet/accounting, and related RPCs. | `supabase/functions/playback/index.ts` and `supabase/migrations/*`. |
| Production notices | The UI explicitly tells users that auth, payments, storage, notifications, and DRM are simulated. | `PrototypeApp` login footnote. |

## What is already documented

The existing [docs/production-improvement-proposal.md](production-improvement-proposal.md) already covers these required production changes:

- Block demo code from production builds.
- Replace demo authentication and client-side role selection with real Supabase Auth, verified contact flows, server-managed roles, admin MFA, and authorization tests.
- Add entitlement checks before playback lock acquisition or media token issuance.
- Build private media delivery with CDN/manifest/key authorization instead of mock app tokens.
- Implement verified payment provider webhooks, idempotency, an immutable ledger, reconciliation, refunds, and transactional entitlement issuance.
- Add canonical catalog, course, lesson, order, order-item, and entitlement tables.
- Add CI, migration reset tests, RLS tests, Expo export checks, release profiles, rollback, and deployment runbooks.
- Add telemetry, crash reporting, structured logs, health checks, alerts, backup/restore evidence, and incident response.
- Correct Expo/mobile production metadata, including production bundle identifiers, build numbers/version codes, update runtime policy, EAS profiles, and store/privacy metadata.

## Production change checklist

### P0 before any real customers

| Change | Required production outcome |
|---|---|
| Replace `PrototypeApp` as the production entry point | Production builds must compile a real app shell using server-backed auth/data; demo mode must be unavailable in production artifacts. |
| Real identity and authorization | No role or identity can be selected from the client. Roles/capabilities are server-managed and tested with negative authorization cases. |
| Real commerce | Payment success must come only from verified provider callbacks/webhooks, not UI state. Orders, ledger entries, refunds, and entitlements must be transactional and auditable. |
| Entitlements | Playback, course access, progress, and downloads must check current server-side entitlements. |
| Protected media | Video access must use a private origin/CDN/DRM-compatible flow with short-lived credentials bound to user, session, course, and lesson. |
| Database/RLS tests | CI must reset migrations from empty state and prove RLS/RPC behavior for anon, student, guardian, teacher, admin, and service role. |
| Release pipeline | Add staging/prod isolation, EAS build/update profiles, signed releases, CI gates, migration sequencing, rollback, and secrets management. |
| Observability and operations | Add logs, metrics, crash reporting, health checks, alerting, backup/PITR policy, restore drill, incident runbook, and support procedures. |

### P1 shortly after the P0 foundation

| Change | Required production outcome |
|---|---|
| API hardening | Strict request schemas, bounded body size, stable error codes, request IDs, timeouts, CORS allowlist, and rate limits on all sensitive routes. |
| Device trust | Use secure device storage, signed challenges, and platform attestation where practical for high-risk actions. |
| Playback consistency | Define Redis/Postgres authority, idempotency, compensation on partial failure, reconciliation, and drift metrics. |
| Audit system | Append-only audit model with restricted writers, normalized events, request/session context, retention policy, redaction, and monitored export access. |
| Load and security validation | Run load tests, Supabase advisors, penetration test, and mobile device/accessibility matrix before launch. |

## Best source to continue from

Use [docs/production-improvement-proposal.md](production-improvement-proposal.md) as the canonical existing report. This file should be treated as the quick handoff summary for the demo flow.

Use [docs/playback-prototype-flows.md](playback-prototype-flows.md) for the current playback sequence diagrams.

Expo-specific production configuration should continue to be checked against the exact SDK 56 docs: https://docs.expo.dev/versions/v56.0.0/
