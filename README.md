# E-Lern Grade 12 Streaming Prototype

An Expo/React Native prototype for the Grade 12 paid learning platform. It runs on web, iOS, and Android and includes student, teacher, and admin journeys plus the self-contained one-active-playback engine and Supabase Edge Function production path.

## Run the frontend

```bash
pnpm install
pnpm web
```

Open `http://localhost:8081`. For native development, run `pnpm ios` or `pnpm android`.

## iOS 26 Liquid Glass

The iOS build uses native `react-native-bottom-tabs` navigation and `expo-glass-effect` surfaces on iOS 26. Android and web use the same component API with translucent RGBA fallbacks, so neither platform loads the iOS-only native glass implementation.

Native tabs are not available in Expo Go. Use an iOS development build with Xcode 26 and an iOS 26 simulator or device:

```bash
pnpm exec expo prebuild --platform ios
pnpm ios
```

After changing Expo, React Native, Hermes, or another native dependency, stop any older Metro processes and rebuild the development client with `pnpm ios`. Reusing a client binary from an older SDK against a newer JavaScript bundle can fail before application code loads. If Metro's cache also predates the upgrade, restart it once with `pnpm exec expo start --dev-client --clear`.

The shared `GlassSurface` component checks both Expo glass availability APIs before rendering `GlassView`; older iOS releases fall back to a standard translucent view. The current UI has no `FlatList`, `SectionList`, or `VirtualizedList` instances near navigation or headers. `@legendapp/list` is installed for future virtualized navigation content and should be used instead of adding a new `FlatList` in those layouts.

## Test the complete demo

1. Choose Student or Teacher, select **Send demo OTP**, then verify with `123456`. Admin access is available only in the web application.
2. As Student, use **Discover** to choose a subject and teacher, watch a free preview, or unlock a course through coupon, manual payment, or the simulated online gateway.
3. Open an enrolled course and start secure playback. This creates a 90-second lock, audit row, and 60-second mock token.
4. Use **Status** to manage devices, **Notifications** to read alerts, and **Support** to submit a ticket.
5. Select **Simulate second device**, then **Force switch**, to test the one-active-device rule.
6. As Teacher, review owned course analytics and student progress.
7. On web, sign in as Admin to manage content, payments, coupons, sessions, devices, broadcasts, audit logs, and report export.

The **Status** page can also take the demo Redis service offline. New playback then fails closed with `LOCK_SERVICE_UNAVAILABLE`.

Protected playback includes a server-issued dynamic watermark. The player shows a masked verified phone number or server-managed username with a short session trace code and moves it to irregular positions every 5–9 seconds. The overlay is removed as soon as the playback lock expires or ends. Native fullscreen is disabled for protected video because a sibling overlay is not guaranteed to remain visible outside the app's player container.

The website and student app share four one-time academic-year plans: Bronze (89,000 IQD), Silver (159,000 IQD), Gold (199,000 IQD), and Platinum VIP (690,000 IQD). Silver, Gold, and Platinum use fixed subject paths; custom multi-teacher bundles are disabled. Access remains valid through the August/September ministerial resits. The web admin Plans view shows the matching payout allocation for each tier.

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
