# E-Lern Grade 12 Streaming Prototype

An Expo/React Native prototype for the Grade 12 paid learning platform. It runs on web, iOS, and Android and includes student, teacher, and admin journeys plus the self-contained one-active-playback engine and Supabase Edge Function production path.

## Run the frontend

```bash
pnpm install
pnpm web
```

Open `http://localhost:8081`. For native development, run `pnpm ios` or `pnpm android`.

## Test the complete demo

1. Choose Student, Teacher, or Admin, select **Send demo OTP**, then verify with `123456`.
2. As Student, use **Discover** to choose a subject and teacher, watch a free preview, or unlock a course through coupon, manual payment, or the simulated online gateway.
3. Open an enrolled course and start secure playback. This creates a 90-second lock, audit row, and 60-second mock token.
4. Use **Status** to manage devices, **Notifications** to read alerts, and **Support** to submit a ticket.
5. Select **Simulate second device**, then **Force switch**, to test the one-active-device rule.
6. As Teacher, review owned course analytics and student progress.
7. As Admin, manage content, payments, coupons, sessions, devices, broadcasts, audit logs, and report export.

The **Status** page can also take the demo Redis service offline. New playback then fails closed with `LOCK_SERVICE_UNAVAILABLE`.

## Run checks

```bash
pnpm run typecheck
pnpm test
pnpm exec expo export --platform web
```

## Run the backend locally

Install Docker and the Supabase CLI, then:

```bash
npx supabase start
npx supabase functions serve playback --env-file supabase/.env.local
```

Create `supabase/.env.local` locally and do not commit it:

```dotenv
PLAYBACK_TOKEN_SECRET=replace-with-a-long-random-secret
UPSTASH_REDIS_REST_URL=https://your-upstash-endpoint
UPSTASH_REDIS_REST_TOKEN=replace-with-your-upstash-token
```

The function receives `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the local Supabase runtime. The app calls the deployed function through `EXPO_PUBLIC_API_BASE_URL`.

## Run Redis locally

The pure lock service and UI demo use an in-memory Redis-compatible model for deterministic testing. To inspect the required commands against a real local Redis server:

```bash
docker run --rm --name e-lern-redis -p 6379:6379 redis:7-alpine
redis-cli SET active_playback:user:user_123 '{"session_id":"session_demo"}' NX EX 90
redis-cli TTL active_playback:user:user_123
```

The Supabase Edge Function uses Upstash's REST protocol, so use Upstash credentials for an end-to-end Edge Function run.

## Database migrations

```bash
npx supabase db reset
```

For the hosted project:

```bash
npx supabase login
npx supabase link --project-ref duhpxuhncnopspzcuade
npx supabase db push
npx supabase functions deploy playback --project-ref duhpxuhncnopspzcuade --use-api
```

The migrations create `user_devices`, `playback_sessions`, and `playback_risk_events` with RLS. Admin log endpoints require `app_metadata.playback_admin = true`; this is not read from editable user metadata.

## API routes

The Edge Function base URL is `${EXPO_PUBLIC_API_BASE_URL}` and provides:

```text
POST /devices/register       (also /register-device)
POST /playback/start         (also /start)
POST /playback/heartbeat     (also /heartbeat)
POST /playback/end           (also /end)
POST /playback/force-switch  (also /force-switch)
GET  /playback/status        (also /status)
GET  /admin/playback-sessions
GET  /admin/risk-events
```

See [docs/playback-prototype-flows.md](docs/playback-prototype-flows.md) for the architecture and sequence diagrams.
