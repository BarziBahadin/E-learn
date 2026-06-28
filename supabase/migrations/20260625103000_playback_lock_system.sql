create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id varchar(255) not null,
  device_name varchar(255),
  platform varchar(50),
  device_model varchar(100),
  os_version varchar(50),
  app_version varchar(20),
  ip_hash varchar(64),
  user_agent_hash varchar(64),
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_blocked boolean not null default false,
  blocked_at timestamptz,
  blocked_reason text,
  unique (user_id, device_id)
);

create table if not exists public.playback_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_device_id uuid references public.user_devices(id) on delete set null,
  device_id varchar(255) not null,
  session_id varchar(100) not null unique,
  lesson_id uuid not null,
  course_id uuid not null,
  lock_version integer not null,
  playback_token_hash varchar(128),
  started_at timestamptz not null,
  last_heartbeat_at timestamptz not null,
  ended_at timestamptz,
  ip_hash varchar(64),
  user_agent_hash varchar(64),
  status varchar(20) not null default 'active',
  end_reason varchar(50),
  risk_score integer not null default 0,
  conflict_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playback_risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_device_id uuid references public.user_devices(id) on delete set null,
  device_id varchar(255),
  session_id varchar(100),
  event_type varchar(50) not null,
  severity varchar(20) not null,
  details jsonb not null default '{}'::jsonb,
  ip_hash varchar(64),
  user_agent_hash varchar(64),
  occurred_at timestamptz not null default now(),
  action_taken varchar(50),
  action_details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_devices_user_id
  on public.user_devices(user_id);
create index if not exists idx_user_devices_device_id
  on public.user_devices(device_id);
create index if not exists idx_user_devices_blocked
  on public.user_devices(is_blocked);

create index if not exists idx_playback_sessions_user_id
  on public.playback_sessions(user_id);
create index if not exists idx_playback_sessions_session_id
  on public.playback_sessions(session_id);
create index if not exists idx_playback_sessions_device_id
  on public.playback_sessions(device_id);
create index if not exists idx_playback_sessions_status
  on public.playback_sessions(status);

create index if not exists idx_playback_risk_events_user_id
  on public.playback_risk_events(user_id);
create index if not exists idx_playback_risk_events_occurred_at
  on public.playback_risk_events(occurred_at);

alter table public.user_devices enable row level security;
alter table public.playback_sessions enable row level security;
alter table public.playback_risk_events enable row level security;

drop policy if exists "Users can read their own devices" on public.user_devices;
create policy "Users can read their own devices"
  on public.user_devices
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own playback sessions" on public.playback_sessions;
create policy "Users can read their own playback sessions"
  on public.playback_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own playback risk events" on public.playback_risk_events;
create policy "Users can read their own playback risk events"
  on public.playback_risk_events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.user_devices to authenticated;
grant select on public.playback_sessions to authenticated;
grant select on public.playback_risk_events to authenticated;

create or replace view public.playback_fraud_alerts
with (security_invoker = true)
as
select
  ps.user_id,
  ps.device_id,
  count(distinct ps.session_id) as session_count,
  count(distinct ps.ip_hash) as ip_count,
  count(distinct ps.user_agent_hash) as ua_count,
  max(ps.started_at) as last_session,
  count(pre.id) as risk_event_count,
  sum(case when pre.severity = 'critical' then 1 else 0 end) as critical_events
from public.playback_sessions ps
left join public.playback_risk_events pre
  on pre.session_id = ps.session_id
where ps.started_at > now() - interval '24 hours'
group by ps.user_id, ps.device_id
having
  count(distinct ps.session_id) > 10
  or count(distinct ps.ip_hash) > 3
  or sum(case when pre.severity = 'critical' then 1 else 0 end) > 2;

grant select on public.playback_fraud_alerts to authenticated;
