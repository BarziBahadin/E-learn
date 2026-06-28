# E-Lern Playback Lock Architecture

The mobile Expo app should not talk to Redis directly and should never own lock authority. It should authenticate with Supabase, send the user's JWT to a backend playback service, and receive short-lived playback/session tokens from that backend.

Backend responsibilities:

- Generate backend-owned `device_id`, `session_id`, `lock_version`, and playback tokens.
- Use atomic Redis Lua scripts for acquire, heartbeat, force disconnect, cooldown, conflict counters, and rate limits.
- Persist playback sessions and risk events in Supabase Postgres with RLS enabled for user-visible data.
- Use `@supabase/server` in request handlers to validate auth and create an RLS-scoped client.
- Keep `SUPABASE_SECRET_KEY`, database passwords, Redis credentials, and signing keys out of Expo public environment variables.

Mobile app responsibilities:

- Store Supabase user sessions with AsyncStorage.
- Call backend playback endpoints with the current Supabase access token.
- Treat conflict, cooldown, and blocked responses as UI states.
- Run heartbeats only for the active playback session returned by the backend.

Relevant local files:

- `utils/supabase.ts` creates the Expo-safe Supabase client.
- `src/features/playback/playbackLockClient.ts` is the mobile API client boundary for the backend playback service.
- `.env.local` contains only Expo public values. Do not add secret keys there.
