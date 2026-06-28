# Deploy Supabase Backend

This project has a Supabase Edge Function at `supabase/functions/playback` and database migrations in `supabase/migrations`.

The current machine is not authenticated with Supabase, so deployment requires your login or an access token.

## 1. Log in

```bash
npx supabase login
```

Or set a dashboard access token:

```bash
export SUPABASE_ACCESS_TOKEN=your_access_token
```

## 2. Link the project

```bash
npx supabase link --project-ref duhpxuhncnopspzcuade
```

The CLI may ask for your database password.

## 3. Set Edge Function secret

```bash
npx supabase secrets set PLAYBACK_TOKEN_SECRET="replace-with-a-long-random-secret"
npx supabase secrets set UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
npx supabase secrets set UPSTASH_REDIS_REST_TOKEN="your_upstash_token"
```

## 4. Push database migrations

```bash
npx supabase db push
```

This creates the playback tables, active lock table, RLS policies, and RPC functions used by the Edge Function.

## 5. Deploy the Edge Function

```bash
npx supabase functions deploy playback --project-ref duhpxuhncnopspzcuade
```

The app is already configured to call:

```text
https://duhpxuhncnopspzcuade.supabase.co/functions/v1/playback
```

## Routes

- `POST /register-device`
- `POST /start`
- `POST /heartbeat`
- `POST /force-switch`
- `POST /end`
- `POST /validate-token`
- `GET /status`

All routes require `Authorization: Bearer <user access token>`.
