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
  v_device_count integer;
begin
  select count(*)
  into v_device_count
  from public.user_devices
  where user_id = p_user_id and is_blocked = false;

  if v_device_count >= 5 then
    insert into public.playback_risk_events (
      user_id,
      event_type,
      severity,
      details,
      ip_hash,
      user_agent_hash,
      action_taken
    )
    values (
      p_user_id,
      'device_limit_exceeded',
      'high',
      jsonb_build_object('device_count', v_device_count, 'max_devices', 5),
      p_ip_hash,
      p_user_agent_hash,
      'registration_blocked'
    );

    return jsonb_build_object(
      'status', 'blocked',
      'reason', 'device_limit_exceeded',
      'data', jsonb_build_object('max_devices', 5)
    );
  end if;

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

create unique index if not exists idx_playback_sessions_session_id_unique
  on public.playback_sessions(session_id);

create or replace function public.persist_playback_session_start(
  p_user_id uuid,
  p_device_id text,
  p_session_id text,
  p_lesson_id uuid,
  p_course_id uuid,
  p_lock_version bigint,
  p_playback_token_hash text,
  p_ip_hash text,
  p_user_agent_hash text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
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
    started_at,
    last_heartbeat_at,
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
    now(),
    now(),
    p_expires_at
  )
  on conflict (user_id) do update
  set device_id = excluded.device_id,
      session_id = excluded.session_id,
      lesson_id = excluded.lesson_id,
      course_id = excluded.course_id,
      lock_version = excluded.lock_version,
      playback_token_hash = excluded.playback_token_hash,
      ip_hash = excluded.ip_hash,
      user_agent_hash = excluded.user_agent_hash,
      started_at = excluded.started_at,
      last_heartbeat_at = excluded.last_heartbeat_at,
      expires_at = excluded.expires_at,
      cooldown_until = null;

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
  )
  on conflict (session_id) do update
  set last_heartbeat_at = excluded.last_heartbeat_at,
      playback_token_hash = excluded.playback_token_hash,
      updated_at = now();

  return jsonb_build_object('status', 'success');
end;
$$;

create or replace function public.expire_stale_playback_sessions()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_count integer;
begin
  update public.playback_sessions ps
  set status = 'expired',
      ended_at = now(),
      end_reason = 'heartbeat_timeout',
      updated_at = now()
  where ps.status = 'active'
    and ps.last_heartbeat_at < now() - interval '90 seconds';

  get diagnostics v_count = row_count;

  delete from public.playback_active_locks
  where expires_at <= now();

  return v_count;
end;
$$;

create or replace function public.calculate_playback_risk_score(
  p_user_id uuid,
  p_device_id text default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_conflicts integer;
  v_critical_events integer;
  v_ip_count integer;
begin
  select count(*)
  into v_conflicts
  from public.playback_risk_events
  where user_id = p_user_id
    and (p_device_id is null or device_id = p_device_id)
    and event_type in ('lock_conflict', 'force_switch')
    and occurred_at > now() - interval '24 hours';

  select count(*)
  into v_critical_events
  from public.playback_risk_events
  where user_id = p_user_id
    and (p_device_id is null or device_id = p_device_id)
    and severity = 'critical'
    and occurred_at > now() - interval '24 hours';

  select count(distinct ip_hash)
  into v_ip_count
  from public.playback_sessions
  where user_id = p_user_id
    and (p_device_id is null or device_id = p_device_id)
    and started_at > now() - interval '24 hours';

  return least(100, (v_conflicts * 15) + (v_critical_events * 30) + greatest(0, v_ip_count - 1) * 10);
end;
$$;

create or replace view public.playback_admin_monitoring
with (security_invoker = true)
as
select
  ps.user_id,
  ps.device_id,
  count(*) filter (where ps.status = 'active') as active_sessions,
  count(*) filter (where ps.started_at > now() - interval '24 hours') as sessions_24h,
  count(distinct ps.ip_hash) filter (where ps.started_at > now() - interval '24 hours') as ip_count_24h,
  count(pre.id) filter (where pre.created_at > now() - interval '24 hours') as risk_events_24h,
  public.calculate_playback_risk_score(ps.user_id, ps.device_id) as risk_score,
  max(ps.last_heartbeat_at) as last_heartbeat_at
from public.playback_sessions ps
left join public.playback_risk_events pre
  on pre.user_id = ps.user_id
  and pre.device_id = ps.device_id
group by ps.user_id, ps.device_id;

grant select on public.playback_admin_monitoring to authenticated;

revoke all on function public.persist_playback_session_start(uuid, text, text, uuid, uuid, bigint, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.expire_stale_playback_sessions() from public, anon, authenticated;
revoke all on function public.calculate_playback_risk_score(uuid, text) from public, anon, authenticated;

grant execute on function public.persist_playback_session_start(uuid, text, text, uuid, uuid, bigint, text, text, text, timestamptz) to service_role;
grant execute on function public.expire_stale_playback_sessions() to service_role;
grant execute on function public.calculate_playback_risk_score(uuid, text) to service_role;
grant execute on function public.calculate_playback_risk_score(uuid, text) to authenticated;
