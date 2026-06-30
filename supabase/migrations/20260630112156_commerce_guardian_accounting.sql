create extension if not exists pgcrypto with schema extensions;

create schema if not exists app_private;
revoke all on schema app_private from public, anon;

create type public.voucher_status as enum ('unused', 'redeemed', 'expired', 'disabled', 'cancelled');
create type public.wallet_transaction_kind as enum (
  'voucher_redemption', 'course_purchase', 'subscription_purchase', 'refund', 'manual_adjustment'
);
create type public.commerce_order_status as enum ('pending', 'completed', 'cancelled', 'refunded');
create type public.commerce_funding_source as enum ('wallet', 'direct_payment', 'mixed');

create table public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  currency text not null default 'IQD' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code_hash bytea not null unique,
  amount bigint not null check (amount > 0),
  currency text not null default 'IQD' check (currency ~ '^[A-Z]{3}$'),
  status public.voucher_status not null default 'unused',
  created_by_admin_id uuid not null references auth.users(id),
  redeemed_by_user_id uuid references auth.users(id),
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voucher_redemption_state check (
    (status = 'redeemed' and redeemed_by_user_id is not null and redeemed_at is not null)
    or (status <> 'redeemed' and redeemed_by_user_id is null and redeemed_at is null)
  )
);

create table public.course_offerings (
  id text primary key,
  title text not null,
  teacher_user_id uuid references auth.users(id),
  bronze_eligible boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_offerings (
  id text primary key,
  title text not null,
  price bigint not null check (price > 0),
  currency text not null default 'IQD' check (currency ~ '^[A-Z]{3}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plan_offerings (id, title, price) values
  ('bronze', 'Bronze Code', 89000),
  ('silver', 'Silver Code', 159000),
  ('gold', 'Gold Code', 199000),
  ('platinum', 'Platinum VIP Code', 690000);

insert into public.course_offerings (id, title, bronze_eligible) values
  ('course_001', 'Grade 12 Physics', true),
  ('course_002', 'Grade 12 Mathematics', true),
  ('course_003', 'Grade 12 Chemistry', true);

create table public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  order_type text not null check (order_type in ('course', 'subscription')),
  course_id text references public.course_offerings(id),
  plan_id text references public.plan_offerings(id),
  teacher_user_id uuid references auth.users(id),
  amount bigint not null check (amount >= 0),
  currency text not null default 'IQD' check (currency ~ '^[A-Z]{3}$'),
  funding_source public.commerce_funding_source not null,
  status public.commerce_order_status not null default 'pending',
  purchased_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_resource check (
    (order_type = 'course' and course_id is not null)
    or (order_type = 'subscription' and plan_id is not null)
  )
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_user_id uuid not null references public.wallets(user_id) on delete cascade,
  kind public.wallet_transaction_kind not null,
  amount bigint not null check (amount <> 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  voucher_id uuid references public.vouchers(id),
  order_id uuid references public.commerce_orders(id),
  created_by_user_id uuid references auth.users(id),
  description text,
  created_at timestamptz not null default now(),
  constraint wallet_transaction_reference check (
    (kind = 'voucher_redemption' and voucher_id is not null)
    or kind <> 'voucher_redemption'
  )
);

create table public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  relationship text not null,
  status text not null default 'active' check (status in ('pending', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_user_id, student_user_id),
  check (parent_user_id <> student_user_id)
);

create table public.student_learning_progress (
  student_user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.course_offerings(id) on delete cascade,
  completed_lessons integer not null default 0 check (completed_lessons >= 0),
  current_lesson_id text,
  current_lesson_title text,
  watched_percent numeric(5,2) not null default 0 check (watched_percent between 0 and 100),
  quiz_average numeric(5,2) check (quiz_average between 0 and 100),
  total_study_seconds bigint not null default 0 check (total_study_seconds >= 0),
  last_active_at timestamptz,
  target_due_at timestamptz,
  target_status text check (target_status in ('upcoming', 'met', 'missed')),
  updated_at timestamptz not null default now(),
  primary key (student_user_id, course_id)
);

create table public.commerce_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index wallet_transactions_user_created_idx on public.wallet_transactions (wallet_user_id, created_at desc);
create index vouchers_status_expires_idx on public.vouchers (status, expires_at) where status = 'unused';
create index orders_reporting_idx on public.commerce_orders (purchased_at desc, status, course_id, teacher_user_id, plan_id);
create index parent_links_parent_idx on public.parent_student_links (parent_user_id, status);
create index parent_links_student_idx on public.parent_student_links (student_user_id, status);

alter table public.wallets enable row level security;
alter table public.vouchers enable row level security;
alter table public.course_offerings enable row level security;
alter table public.plan_offerings enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.commerce_orders enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.student_learning_progress enable row level security;
alter table public.commerce_audit_logs enable row level security;

create policy "Users can read their wallet" on public.wallets for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users can read their wallet transactions" on public.wallet_transactions for select to authenticated
using ((select auth.uid()) = wallet_user_id);
create policy "Users can read their orders" on public.commerce_orders for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Authenticated users can read active courses" on public.course_offerings for select to authenticated
using (active);
create policy "Authenticated users can read active plans" on public.plan_offerings for select to authenticated
using (active);
create policy "Linked families can read active links" on public.parent_student_links for select to authenticated
using ((select auth.uid()) in (parent_user_id, student_user_id));
create policy "Students and linked guardians can read progress" on public.student_learning_progress for select to authenticated
using (
  (select auth.uid()) = student_user_id
  or exists (
    select 1 from public.parent_student_links link
    where link.parent_user_id = (select auth.uid())
      and link.student_user_id = student_learning_progress.student_user_id
      and link.status = 'active'
  )
);

grant select on public.wallets, public.wallet_transactions, public.commerce_orders, public.course_offerings, public.plan_offerings, public.parent_student_links, public.student_learning_progress to authenticated;
revoke all on public.vouchers, public.commerce_audit_logs from anon, authenticated;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
$$;

create policy "Admins can read all wallets" on public.wallets for select to authenticated using ((select app_private.is_admin()));
create policy "Admins can read all wallet transactions" on public.wallet_transactions for select to authenticated using ((select app_private.is_admin()));
create policy "Admins can read vouchers" on public.vouchers for select to authenticated using ((select app_private.is_admin()));
create policy "Admins can read all orders" on public.commerce_orders for select to authenticated using ((select app_private.is_admin()));
create policy "Admins can read family links" on public.parent_student_links for select to authenticated using ((select app_private.is_admin()));
create policy "Admins can read progress" on public.student_learning_progress for select to authenticated using ((select app_private.is_admin()));
create policy "Admins can read commerce audit logs" on public.commerce_audit_logs for select to authenticated using ((select app_private.is_admin()));
grant select on public.vouchers, public.commerce_audit_logs to authenticated;

create or replace function app_private.generate_voucher(
  p_amount bigint,
  p_currency text,
  p_expires_at timestamptz
)
returns table (voucher_id uuid, voucher_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_code text;
  v_id uuid;
begin
  if v_actor is null or not app_private.is_admin() then
    raise exception 'admin authorization required' using errcode = '42501';
  end if;
  if p_amount <= 0 or p_currency !~ '^[A-Z]{3}$' or (p_expires_at is not null and p_expires_at <= now()) then
    raise exception 'invalid voucher parameters' using errcode = '22023';
  end if;

  v_code := 'EL-' || upper(encode(extensions.gen_random_bytes(8), 'hex')) || '-' || upper(encode(extensions.gen_random_bytes(8), 'hex'));
  insert into public.vouchers (code_hash, amount, currency, created_by_admin_id, expires_at)
  values (extensions.digest(upper(replace(v_code, '-', '')), 'sha256'), p_amount, p_currency, v_actor, p_expires_at)
  returning id into v_id;
  insert into public.commerce_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (v_actor, 'voucher.created', 'voucher', v_id::text, jsonb_build_object('amount', p_amount, 'currency', p_currency, 'expires_at', p_expires_at));
  return query select v_id, v_code;
end
$$;

create or replace function app_private.redeem_voucher(p_code text)
returns table (new_balance bigint, currency text, credited_amount bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_voucher public.vouchers%rowtype;
  v_balance bigint;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if length(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')) < 20 then
    raise exception 'invalid voucher code' using errcode = '22023';
  end if;

  select * into v_voucher
  from public.vouchers
  where code_hash = extensions.digest(upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g')), 'sha256')
  for update;
  if not found then raise exception 'voucher not found' using errcode = 'P0002'; end if;
  if v_voucher.status <> 'unused' then raise exception 'voucher is not available' using errcode = 'P0001'; end if;
  if v_voucher.expires_at is not null and v_voucher.expires_at <= now() then
    update public.vouchers set status = 'expired', updated_at = now() where id = v_voucher.id;
    raise exception 'voucher has expired' using errcode = 'P0001';
  end if;

  insert into public.wallets (user_id, balance, currency)
  values (v_user, v_voucher.amount, v_voucher.currency)
  on conflict (user_id) do update
  set balance = public.wallets.balance + excluded.balance, updated_at = now()
  where public.wallets.currency = excluded.currency
  returning balance into v_balance;
  if v_balance is null then raise exception 'wallet currency mismatch' using errcode = '22023'; end if;

  update public.vouchers set status = 'redeemed', redeemed_by_user_id = v_user, redeemed_at = now(), updated_at = now()
  where id = v_voucher.id;
  insert into public.wallet_transactions (wallet_user_id, kind, amount, currency, voucher_id, created_by_user_id, description)
  values (v_user, 'voucher_redemption', v_voucher.amount, v_voucher.currency, v_voucher.id, v_user, 'Voucher redemption');
  insert into public.commerce_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (v_user, 'voucher.redeemed', 'voucher', v_voucher.id::text, jsonb_build_object('amount', v_voucher.amount, 'currency', v_voucher.currency));
  return query select v_balance, v_voucher.currency, v_voucher.amount;
end
$$;

create or replace function app_private.purchase_with_wallet(
  p_order_type text,
  p_course_id text,
  p_plan_id text,
  p_teacher_user_id uuid,
  p_amount bigint,
  p_currency text default 'IQD'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_order_id uuid;
begin
  if v_user is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_amount <= 0 or p_order_type not in ('course', 'subscription') then raise exception 'invalid order' using errcode = '22023'; end if;
  if p_plan_id is null or not exists (
    select 1 from public.plan_offerings
    where id = p_plan_id and active and price = p_amount and currency = p_currency
  ) then raise exception 'server price validation failed' using errcode = '22023'; end if;
  if p_order_type = 'course' and (p_course_id is null or p_plan_id <> 'bronze') then raise exception 'Bronze course selection required' using errcode = '22023'; end if;
  if p_order_type = 'subscription' and p_plan_id = 'bronze' then raise exception 'Bronze must unlock one selected course' using errcode = '22023'; end if;
  if p_order_type = 'course' and not exists (
    select 1 from public.course_offerings
    where id = p_course_id and active and (p_plan_id <> 'bronze' or bronze_eligible)
  ) then raise exception 'course is not eligible for this plan' using errcode = '22023'; end if;

  update public.wallets set balance = balance - p_amount, updated_at = now()
  where user_id = v_user and currency = p_currency and balance >= p_amount;
  if not found then raise exception 'insufficient wallet balance' using errcode = 'P0001'; end if;

  insert into public.commerce_orders (user_id, order_type, course_id, plan_id, teacher_user_id, amount, currency, funding_source, status, purchased_at)
  values (v_user, p_order_type, p_course_id, p_plan_id, p_teacher_user_id, p_amount, p_currency, 'wallet', 'completed', now())
  returning id into v_order_id;
  insert into public.wallet_transactions (wallet_user_id, kind, amount, currency, order_id, created_by_user_id, description)
  values (v_user, case when p_order_type = 'course' then 'course_purchase'::public.wallet_transaction_kind else 'subscription_purchase'::public.wallet_transaction_kind end, -p_amount, p_currency, v_order_id, v_user, 'Wallet purchase');
  return v_order_id;
end
$$;

create or replace function public.generate_voucher(p_amount bigint, p_currency text default 'IQD', p_expires_at timestamptz default null)
returns table (voucher_id uuid, voucher_code text)
language sql security invoker set search_path = ''
as $$ select * from app_private.generate_voucher(p_amount, upper(p_currency), p_expires_at) $$;
create or replace function public.redeem_voucher(p_code text)
returns table (new_balance bigint, currency text, credited_amount bigint)
language sql security invoker set search_path = ''
as $$ select * from app_private.redeem_voucher(p_code) $$;
create or replace function public.purchase_with_wallet(p_order_type text, p_course_id text, p_plan_id text, p_teacher_user_id uuid, p_amount bigint, p_currency text default 'IQD')
returns uuid language sql security invoker set search_path = ''
as $$ select app_private.purchase_with_wallet(p_order_type, p_course_id, p_plan_id, p_teacher_user_id, p_amount, upper(p_currency)) $$;

revoke all on all functions in schema app_private from public, anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.generate_voucher(bigint, text, timestamptz), app_private.redeem_voucher(text), app_private.purchase_with_wallet(text, text, text, uuid, bigint, text) to authenticated;
revoke all on function public.generate_voucher(bigint, text, timestamptz), public.redeem_voucher(text), public.purchase_with_wallet(text, text, text, uuid, bigint, text) from public, anon;
grant execute on function public.generate_voucher(bigint, text, timestamptz), public.redeem_voucher(text), public.purchase_with_wallet(text, text, text, uuid, bigint, text) to authenticated;
