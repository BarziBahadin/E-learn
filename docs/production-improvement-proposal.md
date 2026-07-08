# E-Lern Production Improvement Proposal

Date: 2026-07-08

## Decision

**Current verdict: NOT PRODUCTION READY.**

The repository is a useful product prototype with one partially production-shaped subsystem (playback locking), but the shipped entry point still runs demo authentication, demo commerce, demo authorization, and in-memory product state. It must not accept paying customers until the launch gates below are met.

This proposal is based on repository inspection, successful TypeScript and unit-test runs, Expo SDK 56 documentation, and static review of the Supabase migrations and Edge Function. It is not a substitute for a deployed-environment penetration test, database advisor run, load test, or disaster-recovery exercise.

## Confirmed production blockers

| Priority | Blocker | Evidence | Required outcome |
|---|---|---|---|
| P0 | The released app is the prototype | `App.tsx` always renders `PrototypeApp`; `PrototypeApp.tsx` authenticates selected demo identities with OTP `123456` and explicitly says auth, payments, storage, notifications, and DRM are simulated. | A production application shell using Supabase Auth and server-backed data; demo mode must be excluded from production builds. |
| P0 | Playback has no entitlement check | `startPlayback` and `forceSwitch` in `supabase/functions/playback/index.ts` accept caller-supplied `lesson_id` and `course_id`, check only the device, and issue a signed token. No enrollment/order/lesson ownership query occurs. | In one server-side transaction, verify lesson belongs to course and user has a current entitlement before acquiring a lock or issuing media credentials. Deny by default. |
| P0 | There is no protected media delivery design | Playback tokens are application HMAC values; the prototype plays a bundled MP4. No storage authorization, CDN signing, manifest/key authorization, or token-to-media binding is present. | Private origin, short-lived CDN/manifest credentials bound to user/session/course/lesson, key rotation, revocation, and access logs. |
| P0 | Authentication and role journeys are simulated | Demo users and roles are selected client-side. The only real auth usage is token validation inside the playback function. | Real OTP/provider flow, account lifecycle, verified contacts, server-managed roles in `app_metadata`, session revocation, admin MFA, and authorization tests. |
| P0 | Payments do not exist end to end | The UI simulates gateway success. The schema has wallet functions but no payment provider webhook, signature verification, idempotency ledger, reconciliation, refunds, or entitlement fulfillment. | Provider adapter plus verified webhook ingestion, idempotency key, immutable ledger, order state machine, reconciliation job, refund workflow, and transactional entitlement issuance. |
| P0 | No release pipeline or rollback mechanism | No `.github/workflows`, `eas.json`, deployment manifest, environment promotion workflow, or release health gate exists. `app.json` uses `com.anonymous.E-Lern` on iOS and has no build numbers or update runtime policy. | Separate development/staging/production profiles; CI gates; EAS build/update policy; signed releases; migrations-before-app sequencing; rollback/runbook. |
| P0 | No operational safety net | No crash reporting, metrics, tracing, alert rules, health/readiness checks, SLOs, backup policy, or restore evidence exists. | Production telemetry, paging, audit retention, dependency dashboards, backup/PITR policy, and a tested restore drill. |
| P0 | Database behavior is not integration-tested | Existing tests exercise TypeScript/in-memory models only. There are no tests that apply all migrations and prove RLS/RPC behavior for anon, student, guardian, teacher, admin, and service role. | CI starts an isolated Supabase instance, resets all migrations, runs RLS and transaction-concurrency tests, then runs database advisors. |

## High-risk engineering findings

### 1. Authorization is fragmented

Playback admin access uses `app_metadata.playback_admin`, while commerce uses `app_metadata.role = admin`. This creates two independent privilege models. Teacher ownership, guardian consent, support access, and content-management permissions are not represented as a coherent policy.

Create a single authorization model with explicit capabilities (`playback.read_all`, `commerce.refund`, `content.publish`, etc.). Keep claims server-managed, but treat JWT claims as a cache: sensitive mutations should also check current server-side membership/session state. Add a role-capability matrix and negative authorization tests.

### 2. Commerce trusts client-controlled attribution

`purchase_with_wallet` validates the plan price but accepts `p_teacher_user_id` from the client and stores it directly. That permits false teacher attribution and corrupt payout reporting. Derive teacher and payout allocation from immutable server-side offering/version records. Do not accept price, currency, teacher, or payout data as authoritative client inputs.

The schema also lacks a canonical entitlement table. Add `entitlements` with subject, source order, validity window, status, and revocation reason. Playback must query this table.

### 3. API hardening is incomplete

The Edge Function uses wildcard CORS, converts most server failures to HTTP 400, returns internal error messages, has no request-size limit, and accepts unbounded strings. Redis calls and client fetches have no explicit timeout. Rate limiting covers playback start and force-switch, but not registration, heartbeat, status, token validation, or admin reads; when Redis is unavailable, the start-rate limiter fails open.

Introduce schema validation with strict length/range/UUID checks, a bounded body reader, stable error codes, correct 4xx/5xx mapping, correlation IDs, abort timeouts, endpoint-specific quotas, and IP/account/device abuse controls. Browser CORS should use an environment allowlist. Mobile clients do not require permissive CORS.

### 4. Device identity is weak

The server issues a device ID after accepting descriptive client fields. There is no app/device attestation or proof that subsequent requests originate from the registered installation. Add platform attestation where practical, store a device public key in secure hardware-backed storage, and require signed challenges for high-risk actions such as force-switch. Treat attestation as risk evidence, not the only access control.

### 5. Playback consistency has split authorities

Redis is primary while Postgres is fallback/audit storage. A successful Redis lock followed by a failed Postgres persistence returns an error after the lock already exists. Redis and Postgres may then disagree. Define one authoritative state machine and an explicit consistency contract. Prefer idempotency keys, compensating lock release on persistence failure, reconciliation, and metrics for drift. Test Redis timeout, Postgres timeout, partial success, duplicate requests, and concurrent force-switch.

### 6. Data model boundaries are incomplete

Playback stores `lesson_id` and `course_id` as unconstrained UUIDs, while commerce uses text course IDs. There are no canonical course/lesson foreign keys connecting playback, catalog, orders, and entitlements. This prevents referential integrity and makes authorization joins unreliable.

Create canonical `courses`, `lessons`, `course_versions`, `offerings`, `orders`, `order_items`, and `entitlements` boundaries. Use one identifier type. Add foreign keys, uniqueness constraints for duplicate purchase rules, check constraints for all state transitions, and partial/composite indexes based on measured queries.

### 7. Audit data is not yet an audit system

Audit rows can be inserted by privileged application paths, but there is no tamper-evident retention, redaction policy, actor/session/request context standard, export control, or alerting. Establish an append-only audit schema with restricted writers, normalized event types, before/after metadata where safe, correlation IDs, retention policy, and monitored export access. Do not log access tokens, voucher codes, playback tokens, or unnecessary personal data.

### 8. Mobile/web production configuration is absent

Per Expo SDK 56 documentation, define an update runtime compatibility policy before using EAS Update. Because the app has custom native targets and native dependencies, use the SDK 56 `fingerprint` runtime-version policy unless release operations deliberately choose `nativeVersion`. Add `ios.buildNumber`, `android.versionCode`, `scheme`, production bundle identifiers, EAS project ownership/ID, privacy manifests/permission descriptions as applicable, and store metadata. Validate each profile with `expo config`, `expo export`, native builds, and real devices.

References:

- Expo SDK 56 reference: https://docs.expo.dev/versions/v56.0.0/
- Expo SDK 56 app config: https://docs.expo.dev/versions/v56.0.0/config/app/
- Expo SDK 56 updates: https://docs.expo.dev/versions/v56.0.0/sdk/updates/

## Target architecture

1. **Clients:** separate production student/guardian/teacher navigation from the web admin application. Clients never decide roles, prices, entitlements, or payment outcomes.
2. **Identity:** Supabase Auth with verified contact flows; admin MFA; server-managed memberships/capabilities; secure native session storage; revocation controls.
3. **Application API:** versioned Edge Functions with validation, idempotency, timeouts, rate limits, structured errors, and request IDs. Privileged use of `service_role` remains server-only.
4. **Commerce:** provider-neutral order service, signed webhooks, immutable financial ledger, reconciliation jobs, refunds, and transactional entitlement issuance.
5. **Learning domain:** canonical catalog, course versioning, enrollment/entitlement state, progress events, guardian consent, and teacher ownership.
6. **Media:** private object origin/CDN, authorization at manifest/key delivery, short-lived session credentials, watermark/risk telemetry, and revocation.
7. **Operations:** staging and production isolation, CI/CD, migrations, secrets manager, observability, alerts, backup/restore, incident response, and data-retention controls.

## 30-day remediation plan

### Week 1 — Establish hard launch gates

- Freeze production release and mark all current UI/data paths as prototype-only.
- Add CI for install with frozen lockfile, typecheck, tests, lint, Expo export, migration reset, and secret scanning.
- Add staging/prod environment separation and EAS profiles; correct app identifiers and version/update policy.
- Define canonical roles/capabilities and the catalog/order/entitlement schema.
- Add production telemetry baseline: crash reporting, structured server logs, request IDs, uptime checks, and alerts.
- Write threat model, data classification, SLOs, incident runbook, and backup/restore plan.

Exit criteria: no production profile can compile with demo authentication or simulated payment enabled; all migrations apply from an empty database in CI.

### Week 2 — Identity, authorization, and entitlements

- Implement real Supabase Auth journeys and secure session handling.
- Implement server-side capability checks and admin MFA requirement.
- Add canonical catalog and entitlement tables with RLS.
- Gate playback start/force-switch/token validation on current entitlement and lesson-course membership.
- Add RLS/RPC tests covering positive and negative cases for every role.
- Add API validation, timeouts, error mapping, CORS allowlist, and complete rate limiting.

Exit criteria: an authenticated but unenrolled user cannot obtain playback credentials through any route; role escalation and cross-user access tests pass.

### Week 3 — Commerce and media security

- Implement one payment provider in staging using signed, replay-safe webhooks.
- Add idempotent order transitions, ledger entries, entitlements, refunds, and daily reconciliation.
- Remove client-controlled teacher attribution and pricing authority.
- Implement private media delivery and bind credentials to the authorized playback session.
- Add integration tests for duplicate webhooks, delayed callbacks, partial failures, refunds, token replay, and expired entitlement.

Exit criteria: every paid entitlement is traceable to a verified ledger event and is reversible; direct object/manifest access without authorization fails.

### Week 4 — Reliability and controlled launch

- Load-test authentication, playback start/heartbeat, entitlement lookup, webhooks, and admin queries.
- Test Redis/Postgres partial failures and implement reconciliation/compensation.
- Run Supabase security/performance advisors and fix findings.
- Perform external penetration test and mobile accessibility/device matrix testing.
- Execute backup restore, deployment rollback, secret rotation, and incident-response drills.
- Run a small internal/TestFlight/closed-track pilot with alerts and support procedures.

Exit criteria: launch checklist signed by engineering, security, operations, finance, and product owners; no open P0/P1 defects; rollback and restore evidence attached to the release.

## Delivery backlog by ROI

| Order | Work item | Impact | Effort |
|---:|---|---|---|
| 1 | Block demo code from production builds | Critical | Small |
| 2 | Enforce entitlement before playback token issuance | Critical | Medium |
| 3 | Add migration/RLS CI suite | Critical | Medium |
| 4 | Correct production identifiers and add EAS profiles/version policy | High | Small |
| 5 | Standardize authorization capabilities | Critical | Medium |
| 6 | Add strict API validation, timeouts, and stable errors | High | Medium |
| 7 | Add telemetry, alerts, and request correlation | High | Medium |
| 8 | Add canonical entitlement/catalog relationships | Critical | Medium |
| 9 | Implement verified, idempotent payment webhooks | Critical | Large |
| 10 | Implement private media authorization | Critical | Large |
| 11 | Add backup/restore and rollback drills | High | Medium |
| 12 | Add reconciliation for commerce and playback state | High | Medium |

## Production scorecard

| Category | Current /10 | Launch target |
|---|---:|---:|
| Security | 3 | 8 |
| Backend architecture | 4 | 8 |
| Frontend production readiness | 2 | 8 |
| Database | 5 | 8 |
| Infrastructure/release | 1 | 8 |
| Reliability | 2 | 8 |
| Scalability evidence | 2 | 7 |
| Testing | 3 | 8 |
| Observability | 1 | 8 |
| AI safety | N/A — no AI feature found | N/A until introduced |

The scores reflect evidence in this repository, not hypothetical hosted configuration.

## Scalability expectations

- **100 users:** the prototype can demonstrate flows, but paying users remain unsafe because auth, payment, entitlement, and media delivery are simulated or incomplete.
- **1,000 users:** missing telemetry and reconciliation make incidents difficult to detect; heartbeat traffic and admin scans need measured baselines.
- **10,000 users:** per-request Auth Admin calls for watermark identity, high-frequency heartbeat persistence, unbounded history growth, and monitoring-view joins become material cost/latency risks.
- **100,000 users:** multi-region latency, Redis/Postgres drift, connection/Edge Function quotas, media egress, notification fan-out, and payment reconciliation require explicit capacity plans and load evidence.
- **1,000,000 users:** the current architecture has no demonstrated path. Partitioning/retention, event-driven processing, warehouse/reporting isolation, CDN economics, fraud systems, support tooling, and regional resilience would be separate programs.

Do not optimize for one million users before closing authorization and financial-integrity gaps. The immediate scaling goal should be a measured, observable system that safely serves the first controlled cohort.

## Verification performed

- `pnpm run typecheck`: passed.
- `pnpm test`: 5 files and 26 tests passed.
- `pnpm exec expo config --type public`: resolved SDK 56 configuration; exposed the missing production metadata described above.
- `pnpm exec expo-doctor`: could not run because the command/package is not installed in the repository. Add the supported Expo SDK 56 invocation to CI after confirming it from the versioned documentation.
- No deployed Supabase project, provider sandbox, Redis instance, native release build, or production secrets were mutated.

