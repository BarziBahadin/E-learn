create table if not exists public.playback_active_locks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_id varchar(255) not null,
  session_id varchar(100) not null unique,
  lesson_id uuid not null,
  course_id uuid not null,
  lock_version bigint not null,
  playback_token_hash varchar(128),
  ip_hash varchar(64),
  user_agent_hash varchar(64),
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  expires_at timestamptz not null,
  cooldown_until timestamptz
);

create index if not exists idx_playback_active_locks_session_id
  on public.playback_active_locks(session_id);

alter table public.playback_active_locks enable row level security;

drop policy if exists "Users can read their own active playback lock"
  on public.playback_active_locks;
create policy "Users can read their own active playback lock"
  on public.playback_active_locks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.playback_active_locks to authenticated;

create or replace function public.register_device(
  p_user_id uuid,
  p_device_name text default null,
  p_platform text default null,
  p_device_model text default null,
  p_os_version text default null,
  p_app_version text default null,
  p_ip_hash text default null,
  p_user_agent_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_device_id text := 'dev_' || replace(gen_random_uuid()::text, '-', '');
  v_device public.user_devices;
begin
  insert into public.user_devices (
    user_id,
    device_id,
    device_name,
    platform,
    device_model,
    os_version,
    app_version,
    ip_hash,
    user_agent_hash
  )
  values (
    p_user_id,
    v_device_id,
    p_device_name,
    p_platform,
    p_device_model,
    p_os_version,
    p_app_version,
    p_ip_hash,
    p_user_agent_hash
  )
  returning * into v_device;

  return jsonb_build_object(
    'status', 'success',
    'data', jsonb_build_object(
      'device_id', v_device.device_id,
      'device_name', v_device.device_name,
      'registered_at', v_device.registered_at
    )
  );
end;
$$;

create or replace function public.start_playback_lock(
  p_user_id uuid,
  p_device_id text,
  p_session_id text,
  p_lesson_id uuid,
  p_course_id uuid,
  p_lock_version bigint,
  p_playback_token_hash text,
  p_ip_hash text,
  p_user_agent_hash text,
  p_expires_at timestamptz,
  p_response_playback_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_lock public.playback_active_locks;
  v_device public.user_devices;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select *
  into v_device
  from public.user_devices
  where user_id = p_user_id and device_id = p_device_id;

  if not found then
    return jsonb_build_object('status', 'error', 'message', 'Device is not registered.');
  end if;

  if v_device.is_blocked then
    return jsonb_build_object('status', 'blocked', 'reason', 'device_blocked');
  end if;

  delete from public.playback_active_locks
  where user_id = p_user_id and expires_at <= now();

  select *
  into v_lock
  from public.playback_active_locks
  where user_id = p_user_id;

  if found and v_lock.cooldown_until is not null and v_lock.cooldown_until > now() then
    return jsonb_build_object(
      'status', 'blocked',
      'reason', 'cooldown_active',
      'data', jsonb_build_object('cooldown_until', v_lock.cooldown_until)
    );
  end if;

  if found and v_lock.device_id <> p_device_id then
    insert into public.playback_risk_events (
      user_id,
      device_id,
      session_id,
      event_type,
      severity,
      details,
      ip_hash,
      user_agent_hash
    )
    values (
      p_user_id,
      p_device_id,
      v_lock.session_id,
      'lock_conflict',
      'medium',
      jsonb_build_object(
        'current_device', v_lock.device_id,
        'requested_device', p_device_id
      ),
      p_ip_hash,
      p_user_agent_hash
    );

    update public.playback_sessions
    set conflict_count = conflict_count + 1,
        updated_at = now()
    where session_id = v_lock.session_id;

    return jsonb_build_object(
      'status', 'conflict',
      'data', jsonb_build_object(
        'current_device', v_lock.device_id,
        'current_session', v_lock.session_id,
        'lock_version', v_lock.lock_version,
        'can_force', true
      )
    );
  end if;

  if found then
    update public.playback_active_locks
    set last_heartbeat_at = now(),
        playback_token_hash = p_playback_token_hash,
        ip_hash = p_ip_hash,
        user_agent_hash = p_user_agent_hash,
        expires_at = p_expires_at
    where user_id = p_user_id
    returning * into v_lock;

    update public.playback_sessions
    set last_heartbeat_at = now(),
        playback_token_hash = p_playback_token_hash,
        updated_at = now()
    where session_id = v_lock.session_id;

    return jsonb_build_object(
      'status', 'success',
      'data', jsonb_build_object(
        'session_id', v_lock.session_id,
        'lock_version', v_lock.lock_version,
        'playback_token', p_response_playback_token,
        'expires_at', v_lock.expires_at,
        'action', 'refreshed'
      )
    );
  end if;

  insert into public.playback_active_locks (
    user_id,
    device_id,
    session_id,
    lesson_id,
    course_id,
    lock_version,
    playback_token_hash,
    ip_hash,
    user_agent_hash,
    expires_at
  )
  values (
    p_user_id,
    p_device_id,
    p_session_id,
    p_lesson_id,
    p_course_id,
    p_lock_version,
    p_playback_token_hash,
    p_ip_hash,
    p_user_agent_hash,
    p_expires_at
  )
  returning * into v_lock;

  insert into public.playback_sessions (
    user_id,
    user_device_id,
    device_id,
    session_id,
    lesson_id,
    course_id,
    lock_version,
    playback_token_hash,
    started_at,
    last_heartbeat_at,
    ip_hash,
    user_agent_hash,
    status
  )
  values (
    p_user_id,
    v_device.id,
    p_device_id,
    p_session_id,
    p_lesson_id,
    p_course_id,
    p_lock_version,
    p_playback_token_hash,
    now(),
    now(),
    p_ip_hash,
    p_user_agent_hash,
    'active'
  );

  return jsonb_build_object(
    'status', 'success',
    'data', jsonb_build_object(
      'session_id', v_lock.session_id,
      'lock_version', v_lock.lock_version,
      'playback_token', p_response_playback_token,
      'expires_at', v_lock.expires_at,
      'action', 'acquired'
    )
  );
end;
$$;

create or replace function public.heartbeat_playback_lock(
  p_user_id uuid,
  p_device_id text,
  p_session_id text,
  p_lock_version bigint,
  p_position_seconds integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_lock public.playback_active_locks;
  v_expires_at timestamptz := now() + interval '90 seconds';
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select *
  into v_lock
  from public.playback_active_locks
  where user_id = p_user_id;

  if not found or v_lock.expires_at <= now() then
    delete from public.playback_active_locks where user_id = p_user_id;
    return jsonb_build_object('status', 'error', 'reason', 'lock_expired');
  end if;

  if v_lock.session_id <> p_session_id then
    return jsonb_build_object('status', 'error', 'reason', 'session_mismatch');
  end if;

  if v_lock.lock_version <> p_lock_version then
    return jsonb_build_object(
      'status', 'error',
      'reason', 'version_mismatch',
      'data', jsonb_build_object('current_version', v_lock.lock_version)
    );
  end if;

  if v_lock.device_id <> p_device_id then
    return jsonb_build_object('status', 'error', 'reason', 'device_mismatch');
  end if;

  update public.playback_active_locks
  set last_heartbeat_at = now(),
      expires_at = v_expires_at
  where user_id = p_user_id;

  update public.playback_sessions
  set last_heartbeat_at = now(),
      updated_at = now()
  where session_id = p_session_id;

  return jsonb_build_object(
    'status', 'success',
    'data', jsonb_build_object(
      'refreshed_at', now(),
      'lock_expires_at', v_expires_at,
      'position_seconds', p_position_seconds
    )
  );
end;
$$;

create or replace function public.force_switch_playback_lock(
  p_user_id uuid,
  p_new_device_id text,
  p_new_session_id text,
  p_lesson_id uuid,
  p_course_id uuid,
  p_new_lock_version bigint,
  p_playback_token_hash text,
  p_ip_hash text,
  p_user_agent_hash text,
  p_expires_at timestamptz,
  p_response_playback_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_old_lock public.playback_active_locks;
  v_device public.user_devices;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select *
  into v_old_lock
  from public.playback_active_locks
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('status', 'error', 'reason', 'no_active_session');
  end if;

  select *
  into v_device
  from public.user_devices
  where user_id = p_user_id and device_id = p_new_device_id;

  if not found then
    return jsonb_build_object('status', 'error', 'message', 'Device is not registered.');
  end if;

  update public.playback_sessions
  set status = 'force_switched',
      ended_at = now(),
      end_reason = 'force_switch',
      updated_at = now()
  where session_id = v_old_lock.session_id;

  insert into public.playback_risk_events (
    user_id,
    device_id,
    session_id,
    event_type,
    severity,
    details,
    ip_hash,
    user_agent_hash,
    action_taken
  )
  values (
    p_user_id,
    p_new_device_id,
    v_old_lock.session_id,
    'force_switch',
    'high',
    jsonb_build_object('old_device', v_old_lock.device_id, 'new_device', p_new_device_id),
    p_ip_hash,
    p_user_agent_hash,
    'old_session_ended'
  );

  update public.playback_active_locks
  set device_id = p_new_device_id,
      session_id = p_new_session_id,
      lesson_id = p_lesson_id,
      course_id = p_course_id,
      lock_version = p_new_lock_version,
      playback_token_hash = p_playback_token_hash,
      ip_hash = p_ip_hash,
      user_agent_hash = p_user_agent_hash,
      started_at = now(),
      last_heartbeat_at = now(),
      expires_at = p_expires_at,
      cooldown_until = now() + interval '10 seconds'
  where user_id = p_user_id;

  insert into public.playback_sessions (
    user_id,
    user_device_id,
    device_id,
    session_id,
    lesson_id,
    course_id,
    lock_version,
    playback_token_hash,
    started_at,
    last_heartbeat_at,
    ip_hash,
    user_agent_hash,
    status
  )
  values (
    p_user_id,
    v_device.id,
    p_new_device_id,
    p_new_session_id,
    p_lesson_id,
    p_course_id,
    p_new_lock_version,
    p_playback_token_hash,
    now(),
    now(),
    p_ip_hash,
    p_user_agent_hash,
    'active'
  );

  return jsonb_build_object(
    'status', 'success',
    'data', jsonb_build_object(
      'session_id', p_new_session_id,
      'lock_version', p_new_lock_version,
      'playback_token', p_response_playback_token,
      'old_session_ended', true,
      'old_session_id', v_old_lock.session_id,
      'old_device_id', v_old_lock.device_id,
      'expires_at', p_expires_at
    )
  );
end;
$$;

create or replace function public.end_playback_lock(
  p_user_id uuid,
  p_device_id text,
  p_session_id text,
  p_position_seconds integer default null,
  p_completed boolean default false,
  p_end_reason text default 'user_ended'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_deleted_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  delete from public.playback_active_locks
  where user_id = p_user_id
    and device_id = p_device_id
    and session_id = p_session_id;

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count = 0 then
    return jsonb_build_object('status', 'error', 'reason', 'session_not_found');
  end if;

  update public.playback_sessions
  set status = case when p_completed then 'completed' else 'ended' end,
      ended_at = now(),
      end_reason = p_end_reason,
      updated_at = now()
  where session_id = p_session_id;

  return jsonb_build_object(
    'status', 'success',
    'data', jsonb_build_object('position_seconds', p_position_seconds)
  );
end;
$$;

create or replace function public.get_playback_lock_status(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_lock public.playback_active_locks;
begin
  delete from public.playback_active_locks
  where user_id = p_user_id and expires_at <= now();

  select *
  into v_lock
  from public.playback_active_locks
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('status', 'idle');
  end if;

  return jsonb_build_object(
    'status', 'active',
    'data', jsonb_build_object(
      'session_id', v_lock.session_id,
      'device_id', v_lock.device_id,
      'lesson_id', v_lock.lesson_id,
      'course_id', v_lock.course_id,
      'lock_version', v_lock.lock_version,
      'started_at', v_lock.started_at,
      'last_heartbeat', v_lock.last_heartbeat_at,
      'expires_at', v_lock.expires_at
    )
  );
end;
$$;

revoke all on function public.register_device(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.start_playback_lock(uuid, text, text, uuid, uuid, bigint, text, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.heartbeat_playback_lock(uuid, text, text, bigint, integer) from public, anon, authenticated;
revoke all on function public.force_switch_playback_lock(uuid, text, text, uuid, uuid, bigint, text, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.end_playback_lock(uuid, text, text, integer, boolean, text) from public, anon, authenticated;
revoke all on function public.get_playback_lock_status(uuid) from public, anon, authenticated;

grant execute on function public.register_device(uuid, text, text, text, text, text, text, text) to service_role;
grant execute on function public.start_playback_lock(uuid, text, text, uuid, uuid, bigint, text, text, text, timestamptz, text) to service_role;
grant execute on function public.heartbeat_playback_lock(uuid, text, text, bigint, integer) to service_role;
grant execute on function public.force_switch_playback_lock(uuid, text, text, uuid, uuid, bigint, text, text, text, timestamptz, text) to service_role;
grant execute on function public.end_playback_lock(uuid, text, text, integer, boolean, text) to service_role;
grant execute on function public.get_playback_lock_status(uuid) to service_role;
