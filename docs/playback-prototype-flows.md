# Playback Prototype Flows

## System architecture

```mermaid
flowchart LR
  App[Expo app\nWeb iOS Android] -->|Supabase JWT + device ID| API[Supabase Edge Function\nREST API]
  API --> Auth[Supabase Auth]
  API -->|Atomic lock + TTL| Redis[(Upstash Redis)]
  API -->|Sessions devices risks| DB[(Supabase Postgres)]
  API -->|60-second mock token| App
  App -->|Token| Video[Video CDN / DRM later]
```

## Start playback

```mermaid
sequenceDiagram
  participant App
  participant API
  participant Redis
  participant DB
  App->>API: POST /playback/start
  API->>DB: Verify registered, unblocked device
  API->>Redis: SET lock JSON NX EX 90
  alt lock acquired
    API->>DB: INSERT playback_sessions
    API-->>App: session_id + 60s video token
  else lock exists
    API->>DB: INSERT conflict risk event
    API-->>App: ACTIVE_SESSION_EXISTS
  end
```

## Heartbeat

```mermaid
sequenceDiagram
  participant App
  participant API
  participant Redis
  participant DB
  App->>API: POST /playback/heartbeat
  API->>Redis: Lua validate user + device + session + version
  alt exact match
    Redis-->>API: Refresh TTL to 90s
    API->>DB: UPDATE last_heartbeat_at
    API-->>App: ok, ttl_refreshed
  else stale or mismatched
    Redis-->>API: Reject
    API->>DB: INSERT heartbeat_rejected risk
    API-->>App: error; stop playback
  end
```

## Conflict and force switch

```mermaid
sequenceDiagram
  participant DeviceA
  participant API
  participant Redis
  participant DB
  participant DeviceB
  DeviceB->>API: Start playback
  API->>Redis: SET NX EX 90
  Redis-->>API: Lock already held by DeviceA
  API-->>DeviceB: Conflict + can_force_switch
  DeviceB->>API: Force switch
  API->>Redis: Atomically replace lock; increment version
  API->>DB: End old session + log FORCE_SWITCH + create new session
  API-->>DeviceB: New session and token
  DeviceA->>API: Old heartbeat
  API-->>DeviceA: SESSION_MISMATCH
```

## Session expiry

```mermaid
sequenceDiagram
  participant App
  participant Redis
  participant API
  participant DB
  App--xAPI: Heartbeats stop
  Redis->>Redis: 90-second TTL reaches zero
  App->>API: Next heartbeat or status request
  API->>Redis: Read active lock
  Redis-->>API: Missing
  API->>DB: Mark session LOCK_EXPIRED
  API-->>App: Session expired; stop video
```

## Safe end playback

```mermaid
sequenceDiagram
  participant App
  participant API
  participant Redis
  participant DB
  App->>API: POST /playback/end with device + session
  API->>Redis: Lua compare stored device + session
  alt exact match
    Redis->>Redis: DEL active lock
    API->>DB: Set ended_at and USER_STOPPED
    API-->>App: ok
  else stale request
    Redis-->>API: Reject without deleting lock
    API->>DB: Log end rejection
    API-->>App: SESSION_NOT_FOUND
  end
```
