-- ============================================================================
-- Migration 0003: Ebook library (files stored privately on Google Drive),
-- product ↔ ebook links, admin free-access grants, per-member reading progress,
-- and entitlement RPCs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EBOOKS: metadata only. The PDF itself lives in a private Google Drive folder
-- and is only ever streamed through the app server; drive ids never reach the
-- browser.
-- ----------------------------------------------------------------------------
create table if not exists public.ebooks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  description text,
  drive_file_id text not null unique,
  cover_drive_file_id text,
  mime_type text not null default 'application/pdf',
  file_size_bytes bigint,
  page_count integer,
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ebooks_created on public.ebooks (created_at desc, id);

-- One ebook can be sold in several products (bundles); one product can carry many ebooks.
create table if not exists public.product_ebooks (
  product_id uuid not null references public.products(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, ebook_id)
);

create index if not exists idx_product_ebooks_ebook on public.product_ebooks (ebook_id);

create table if not exists public.ebook_reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  last_page integer not null default 1 check (last_page >= 1),
  total_pages integer check (total_pages is null or total_pages >= 1),
  bookmarks integer[] not null default '{}',
  started_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (user_id, ebook_id)
);

create index if not exists idx_ebook_progress_user_recent
  on public.ebook_reading_progress (user_id, last_read_at desc);

-- Membership lookups by user (the email index already exists).
create index if not exists idx_membership_user_status
  on public.membership_subscriptions (user_id, status, expires_at desc);

alter table public.ebooks enable row level security;
alter table public.product_ebooks enable row level security;
alter table public.ebook_reading_progress enable row level security;

drop policy if exists "Admin manage ebooks" on public.ebooks;
create policy "Admin manage ebooks" on public.ebooks for all using (public.is_admin());

drop policy if exists "Admin manage product_ebooks" on public.product_ebooks;
create policy "Admin manage product_ebooks" on public.product_ebooks for all using (public.is_admin());

drop policy if exists "Member manage own reading progress" on public.ebook_reading_progress;
create policy "Member manage own reading progress" on public.ebook_reading_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- SECURITY FIX: the "Own profile update" policy let a member update every column
-- of their own profile through the public API, including role -> 'admin' (which
-- would unlock every ebook and the admin APIs). Self-service updates are now
-- limited to harmless columns; role changes go through the service role only.
-- ----------------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url, bank_name, bank_account_number, bank_account_holder, updated_at)
  on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- FREE ACCESS GRANTS (given by the admin)
-- One row per (email, ebook). ebook_id NULL = every ebook, including future ones.
-- Matched by user id, or by email once the member has confirmed that email, so a
-- grant can be given before the person even registers.
-- ----------------------------------------------------------------------------
create table if not exists public.ebook_grants (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  user_id uuid references auth.users(id) on delete set null,
  ebook_id uuid references public.ebooks(id) on delete cascade,
  note text,
  expires_at timestamptz,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ebook_grants_email_ebook
  on public.ebook_grants (email, ebook_id) where ebook_id is not null;
create unique index if not exists idx_ebook_grants_email_all
  on public.ebook_grants (email) where ebook_id is null;
create index if not exists idx_ebook_grants_user on public.ebook_grants (user_id) where user_id is not null;
create index if not exists idx_ebook_grants_created on public.ebook_grants (created_at desc, id);

alter table public.ebook_grants enable row level security;
drop policy if exists "Admin manage ebook_grants" on public.ebook_grants;
create policy "Admin manage ebook_grants" on public.ebook_grants for all using (public.is_admin());

-- ----------------------------------------------------------------------------
-- ENTITLEMENT
-- A member can read an ebook through:
--   * purchase: a non-membership product in a PAID order placed by them (by user id,
--     or by their email once confirmed, which covers guest checkouts),
--   * membership: a membership product while the subscription is active,
--   * gift: an unexpired admin grant for that ebook or for all ebooks.
-- Each branch is a separate indexed lookup (UNION instead of OR).
-- ----------------------------------------------------------------------------
drop function if exists public.can_read_ebook(uuid);
drop function if exists public.get_member_library();
drop function if exists public.member_owned_product_ids(uuid);

create or replace function public.member_owned_product_ids(p_user uuid)
returns table (product_id uuid, via_membership boolean)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select u.id, lower(u.email) as email, (u.email_confirmed_at is not null) as confirmed
    from auth.users u
    where u.id = p_user
  )
  select oi.product_id, false
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.buyer_user_id = p_user
    and o.payment_status = 'paid'
    and oi.product_type <> 'membership'
  union
  select oi.product_id, false
  from me
  join public.orders o on lower(o.buyer_email) = me.email and me.confirmed
  join public.order_items oi on oi.order_id = o.id
  where o.payment_status = 'paid'
    and oi.product_type <> 'membership'
  union
  select ms.product_id, true
  from public.membership_subscriptions ms
  where ms.user_id = p_user
    and ms.status = 'active'
    and ms.expires_at > now()
  union
  select ms.product_id, true
  from me
  join public.membership_subscriptions ms on lower(ms.buyer_email) = me.email and me.confirmed
  where ms.status = 'active'
    and ms.expires_at > now();
$$;

-- Unexpired grants for a member; a NULL ebook_id row means "all ebooks".
create or replace function public.member_granted_ebook_ids(p_user uuid)
returns table (ebook_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select u.id, lower(u.email) as email, (u.email_confirmed_at is not null) as confirmed
    from auth.users u
    where u.id = p_user
  )
  select g.ebook_id
  from public.ebook_grants g
  where g.user_id = p_user
    and (g.expires_at is null or g.expires_at > now())
  union
  select g.ebook_id
  from me
  join public.ebook_grants g on g.email = me.email and me.confirmed
  where g.expires_at is null or g.expires_at > now();
$$;

revoke all on function public.member_owned_product_ids(uuid) from public, anon, authenticated;
revoke all on function public.member_granted_ebook_ids(uuid) from public, anon, authenticated;

-- The whole published catalog for the signed-in member: owned ebooks with progress,
-- and locked ones with only what is needed to show the cover and a buy link.
create or replace function public.get_member_library()
returns table (
  id uuid,
  title text,
  author text,
  description text,
  has_cover boolean,
  page_count integer,
  file_size_bytes bigint,
  created_at timestamptz,
  updated_at timestamptz,
  is_owned boolean,
  access_source text,
  last_page integer,
  total_pages integer,
  bookmarks integer[],
  last_read_at timestamptz,
  buy_slug text,
  buy_price numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with owned_products as (
    select * from public.member_owned_product_ids(auth.uid())
  ),
  via_products as (
    select pe.ebook_id, bool_and(op.via_membership) as only_membership
    from owned_products op
    join public.product_ebooks pe on pe.product_id = op.product_id
    group by pe.ebook_id
  ),
  grants as (
    select * from public.member_granted_ebook_ids(auth.uid())
  ),
  has_all as (
    select exists (select 1 from grants g where g.ebook_id is null) as yes
  ),
  lib as (
    select
      e.*,
      case
        when vp.ebook_id is not null and not vp.only_membership then 'purchase'
        when vp.ebook_id is not null then 'membership'
        when (select yes from has_all) or exists (select 1 from grants g where g.ebook_id = e.id) then 'gift'
      end as access_source
    from public.ebooks e
    left join via_products vp on vp.ebook_id = e.id
    where e.status = 'published'
  )
  select
    l.id, l.title, l.author,
    case when l.access_source is not null then l.description end,
    (l.cover_drive_file_id is not null),
    l.page_count, l.file_size_bytes, l.created_at, l.updated_at,
    (l.access_source is not null),
    l.access_source,
    rp.last_page, rp.total_pages, coalesce(rp.bookmarks, '{}'), rp.last_read_at,
    buy.slug, buy.price
  from lib l
  left join public.ebook_reading_progress rp
    on l.access_source is not null and rp.ebook_id = l.id and rp.user_id = auth.uid()
  left join lateral (
    select p.slug, p.price
    from public.product_ebooks pe
    join public.products p on p.id = pe.product_id and p.status = 'published'
    where l.access_source is null and pe.ebook_id = l.id
    order by p.price asc, p.id
    limit 1
  ) buy on true
  where auth.uid() is not null
  order by (l.access_source is not null) desc, rp.last_read_at desc nulls last, l.created_at desc, l.id;
$$;

revoke all on function public.get_member_library() from public, anon;
grant execute on function public.get_member_library() to authenticated;

-- Single-ebook gate used by the reader. Admins may preview any ebook.
create or replace function public.can_read_ebook(p_ebook uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.is_admin()
    or (
      exists (select 1 from public.ebooks e where e.id = p_ebook and e.status = 'published')
      and (
        exists (
          select 1
          from public.product_ebooks pe
          where pe.ebook_id = p_ebook
            and pe.product_id in (select op.product_id from public.member_owned_product_ids(auth.uid()) op)
        )
        or exists (
          select 1 from public.member_granted_ebook_ids(auth.uid()) g
          where g.ebook_id is null or g.ebook_id = p_ebook
        )
      )
    )
  );
$$;

revoke all on function public.can_read_ebook(uuid) from public, anon;
grant execute on function public.can_read_ebook(uuid) to authenticated;

notify pgrst, 'reload schema';
