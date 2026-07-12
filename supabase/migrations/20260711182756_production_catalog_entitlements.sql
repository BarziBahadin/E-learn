create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  role text not null default 'student' check (role in ('student', 'guardian', 'teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  teacher_user_id uuid references auth.users(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'published' and published_at is not null) or status <> 'published')
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  position integer not null check (position > 0),
  is_preview boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  media_asset_key text check (media_asset_key is null or char_length(media_asset_key) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position),
  unique (id, course_id)
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  source_order_id uuid references public.commerce_orders(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at),
  check (
    (status = 'revoked' and revoked_at is not null and revocation_reason is not null)
    or (status <> 'revoked' and revoked_at is null)
  )
);

create index courses_teacher_status_idx on public.courses (teacher_user_id, status);
create index lessons_course_status_idx on public.lessons (course_id, status, position);
create index entitlements_active_lookup_idx
  on public.entitlements (user_id, course_id, expires_at)
  where status = 'active';
create unique index entitlements_order_course_unique_idx
  on public.entitlements (source_order_id, course_id)
  where source_order_id is not null;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.entitlements enable row level security;

create policy "Users can read their profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Authenticated users can read published courses"
on public.courses for select to authenticated
using (status = 'published');

create policy "Teachers can read their own courses"
on public.courses for select to authenticated
using ((select auth.uid()) = teacher_user_id);

create policy "Users can read available lessons"
on public.lessons for select to authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.courses c
    where c.id = lessons.course_id
      and c.status = 'published'
  )
  and (
    is_preview
    or exists (
      select 1
      from public.entitlements e
      where e.user_id = (select auth.uid())
        and e.course_id = lessons.course_id
        and e.status = 'active'
        and e.starts_at <= now()
        and (e.expires_at is null or e.expires_at > now())
    )
  )
);

create policy "Users can read their entitlements"
on public.entitlements for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.authorize_lesson_playback(
  p_user_id uuid,
  p_course_id uuid,
  p_lesson_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.lessons l
    join public.courses c on c.id = l.course_id
    join public.entitlements e on e.course_id = c.id
    where l.id = p_lesson_id
      and l.course_id = p_course_id
      and l.status = 'published'
      and c.status = 'published'
      and e.user_id = p_user_id
      and e.status = 'active'
      and e.starts_at <= now()
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

revoke all on function public.authorize_lesson_playback(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.authorize_lesson_playback(uuid, uuid, uuid) to service_role;
