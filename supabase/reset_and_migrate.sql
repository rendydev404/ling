-- ============================================================================
-- LING — FULL DATABASE RESET & OVERWRITE MIGRATION
-- Target Project: https://aachoudpemjvgjqlvcqp.supabase.co
-- Drops all legacy tables, views, functions, and enum types in public schema
-- (without breaking installed PostgreSQL extensions), then installs Ling schema.
-- ============================================================================

do $$
declare
  r record;
begin
  -- 1. Drop all user views & materialized views in public (excluding extension objects)
  for r in (
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('v', 'm')
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid
          and d.deptype = 'e'
      )
  ) loop
    if r.relkind = 'm' then
      execute format('drop materialized view if exists public.%I cascade', r.relname);
    else
      execute format('drop view if exists public.%I cascade', r.relname);
    end if;
  end loop;

  -- 2. Drop all user tables in public (including old foods, food_samples, scans, etc.)
  for r in (
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid
          and d.deptype = 'e'
      )
  ) loop
    execute format('drop table if exists public.%I cascade', r.relname);
  end loop;

  -- 3. Drop all user functions/RPCs in public (match_food, log_scan, day_log, search_foods, etc.)
  for r in (
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
  ) loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;

  -- 4. Drop all user enum types in public
  for r in (
    select t.typname
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typtype = 'e'
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_type'::regclass
          and d.objid = t.oid
          and d.deptype = 'e'
      )
  ) loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;

-- ============================================================================
-- Ling — Single-Creator Storefront & Monetization Platform (Lynk.id Clone)
-- Migration 0001: Complete Relational Schema, Indexes, RLS & Storage Buckets
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'buyer', 'affiliate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_type as enum ('digital', 'course', 'appointment', 'event', 'physical', 'donation', 'membership');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bio_block_type as enum ('link', 'product', 'heading', 'text', 'image', 'video', 'divider');
exception when duplicate_object then null; end $$;

do $$ begin
  create type digital_asset_type as enum ('file', 'external_url', 'license_key');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lesson_content_type as enum ('video', 'article', 'file');
exception when duplicate_object then null; end $$;

do $$ begin
  create type voucher_discount_type as enum ('percentage', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'expired', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type shipping_status as enum ('not_applicable', 'processing', 'shipped', 'delivered');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('pending_payment', 'confirmed', 'completed', 'rescheduled', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type affiliate_status as enum ('pending', 'active', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commission_status as enum ('pending', 'available', 'paid', 'reversed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payout_status as enum ('requested', 'approved', 'paid', 'rejected');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 1. STORE SETTINGS (SINGLETON FOR SINGLE-CREATOR STOREFRONT)
-- ----------------------------------------------------------------------------
create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text unique not null default 'primary',
  brand_name text not null default 'Ling Studio',
  handle text not null default 'lingstudio',
  tagline text not null default 'Produk Digital, Kelas Online, & Konsultasi Eksklusif',
  bio text not null default 'Selamat datang di halaman resmi saya. Temukan e-book, template, kelas online, hingga sesi konsultasi 1-on-1 di satu tempat.',
  avatar_url text,
  verified_badge boolean not null default true,
  theme_config jsonb not null default '{
    "preset": "neo-cyan",
    "backgroundColor": "#f4f8fb",
    "surfaceColor": "#ffffff",
    "borderColor": "#0f172a",
    "textColor": "#0f172a",
    "mutedTextColor": "#334155",
    "accentColor": "#22d3ee",
    "accentTextColor": "#0f172a",
    "secondaryAccentColor": "#a855f7",
    "buttonRadius": "md"
  }'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  payment_channels jsonb not null default '{}'::jsonb,
  seo_config jsonb not null default '{
    "metaTitle": "Ling Studio — Storefront Resmi",
    "metaDescription": "Produk digital, kursus online, konsultasi 1-on-1, dan event eksklusif.",
    "ogImageUrl": ""
  }'::jsonb,
  pixels_config jsonb not null default '{
    "metaPixelId": "",
    "tiktokPixelId": "",
    "ga4MeasurementId": ""
  }'::jsonb,
  shipping_options jsonb not null default '[
    {"code": "jne-reg", "name": "JNE Reguler", "estimatedDays": "2-4 hari", "cost": 18000},
    {"code": "jnt-exp", "name": "J&T Express", "estimatedDays": "2-3 hari", "cost": 20000},
    {"code": "sicepat", "name": "SiCepat BEST", "estimatedDays": "1-2 hari", "cost": 25000}
  ]'::jsonb,
  default_affiliate_commission_pct numeric(5,2) not null default 20.00,
  affiliate_auto_approve boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Seed default singleton row
insert into public.store_settings (singleton_key)
values ('primary')
on conflict (singleton_key) do nothing;

-- ----------------------------------------------------------------------------
-- 2. PROFILES (EXTENDS auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  avatar_url text,
  role user_role not null default 'buyer',
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles (lower(email));
create index if not exists idx_profiles_role on public.profiles (role);

-- Helper function to check admin role safely in RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) or lower(coalesce(auth.jwt() ->> 'email', '')) = 'rendyakun50@gmail.com';
$$;

-- Trigger to auto-create profile on signup (rendyakun50@gmail.com becomes admin)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role user_role;
begin
  if lower(coalesce(new.email, '')) = 'rendyakun50@gmail.com' then
    assigned_role := 'admin';
  else
    assigned_role := 'buyer';
  end if;

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    assigned_role
  )
  on conflict (id) do nothing;

  -- Auto-link any previous guest orders by email
  update public.orders
  set buyer_user_id = new.id
  where lower(buyer_email) = lower(new.email)
    and buyer_user_id is null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS (7 MONETIZATION TYPES)
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  type product_type not null,
  title text not null,
  short_description text,
  description text,
  thumbnail_url text,
  gallery_urls text[] not null default '{}',
  price numeric(12,2) not null default 0 check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  is_pay_what_you_want boolean not null default false,
  min_price numeric(12,2) not null default 0 check (min_price >= 0),
  status product_status not null default 'published',
  is_featured boolean not null default false,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  order_bump_product_id uuid references public.products(id) on delete set null,
  order_bump_price numeric(12,2) check (order_bump_price is null or order_bump_price >= 0),
  order_bump_headline text,
  affiliate_enabled boolean not null default true,
  affiliate_commission_pct numeric(5,2) not null default 20.00 check (affiliate_commission_pct >= 0 and affiliate_commission_pct <= 90),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_status_created on public.products (status, created_at desc);
create index if not exists idx_products_type_status on public.products (type, status);
create index if not exists idx_products_featured on public.products (is_featured) where status = 'published';

-- ----------------------------------------------------------------------------
-- 4. BIO BLOCKS (LINK-IN-BIO PAGE BUILDER)
-- ----------------------------------------------------------------------------
create table if not exists public.bio_blocks (
  id uuid primary key default gen_random_uuid(),
  type bio_block_type not null,
  title text,
  subtitle text,
  url text,
  image_url text,
  product_id uuid references public.products(id) on delete set null,
  badge_text text,
  layout_style text not null default 'compact' check (layout_style in ('compact', 'featured')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  click_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bio_blocks_active_order on public.bio_blocks (is_active, sort_order asc);

-- ----------------------------------------------------------------------------
-- 5. DIGITAL ASSETS & PHYSICAL VARIANTS
-- ----------------------------------------------------------------------------
create table if not exists public.product_digital_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  asset_type digital_asset_type not null default 'file',
  title text not null,
  storage_path text,
  external_url text,
  license_key_value text,
  file_size_bytes bigint,
  download_limit integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_digital_assets_product on public.product_digital_assets (product_id, sort_order asc);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text,
  price_override numeric(12,2) check (price_override is null or price_override >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  weight_grams integer not null default 200 check (weight_grams >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_variants_product on public.product_variants (product_id) where is_active = true;

-- ----------------------------------------------------------------------------
-- 6. ONLINE COURSE (LMS)
-- ----------------------------------------------------------------------------
create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_sections_product on public.course_sections (product_id, sort_order asc);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  content_type lesson_content_type not null default 'video',
  video_url text,
  body_markdown text,
  attachment_path text,
  duration_minutes integer not null default 10,
  is_free_preview boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_lessons_section on public.course_lessons (section_id, sort_order asc);
create index if not exists idx_course_lessons_product on public.course_lessons (product_id, sort_order asc);

-- ----------------------------------------------------------------------------
-- 7. VOUCHERS / COUPONS
-- ----------------------------------------------------------------------------
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type voucher_discount_type not null default 'percentage',
  discount_value numeric(12,2) not null check (discount_value > 0),
  max_discount_amount numeric(12,2) check (max_discount_amount is null or max_discount_amount >= 0),
  min_order_amount numeric(12,2) not null default 0 check (min_order_amount >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  applicable_product_id uuid references public.products(id) on delete set null,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_vouchers_code_active on public.vouchers (upper(code)) where is_active = true;

-- ----------------------------------------------------------------------------
-- 8. AFFILIATES
-- ----------------------------------------------------------------------------
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  referral_code text unique not null,
  status affiliate_status not null default 'active',
  commission_rate_override numeric(5,2),
  total_clicks integer not null default 0,
  total_conversions integer not null default 0,
  total_earned numeric(14,2) not null default 0,
  total_paid_out numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliates_code on public.affiliates (upper(referral_code));

create table if not exists public.affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  referrer_url text,
  visitor_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_affiliate_clicks_aff_created on public.affiliate_clicks (affiliate_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 9. ORDERS & ORDER ITEMS
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  midtrans_order_id text unique not null,
  buyer_user_id uuid references public.profiles(id) on delete set null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  voucher_id uuid references public.vouchers(id) on delete set null,
  voucher_code text,
  affiliate_id uuid references public.affiliates(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  shipping_cost numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  payment_status payment_status not null default 'pending',
  payment_method text,
  midtrans_snap_token text,
  midtrans_redirect_url text,
  midtrans_raw_payload jsonb,
  payment_instructions jsonb,
  payment_expires_at timestamptz,
  access_email_sent_at timestamptz,
  shipping_address jsonb,
  shipping_courier text,
  shipping_tracking_number text,
  shipping_status shipping_status not null default 'not_applicable',
  buyer_note text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_status_created on public.orders (payment_status, created_at desc);
create index if not exists idx_orders_buyer_email on public.orders (lower(buyer_email), created_at desc);
create index if not exists idx_orders_buyer_user on public.orders (buyer_user_id, created_at desc);
create index if not exists idx_orders_affiliate on public.orders (affiliate_id) where affiliate_id is not null;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_title text not null,
  product_type product_type not null,
  is_order_bump boolean not null default false,
  unit_price numeric(12,2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  total_price numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_order_items_product on public.order_items (product_id);

-- ----------------------------------------------------------------------------
-- 10. FULFILLMENT TABLES (COURSES, APPOINTMENTS, EVENTS, MEMBERSHIPS, DONATIONS)
-- ----------------------------------------------------------------------------
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  buyer_email text not null,
  enrolled_at timestamptz not null default now(),
  unique (product_id, buyer_email)
);

create index if not exists idx_course_enrollments_user on public.course_enrollments (user_id);
create index if not exists idx_course_enrollments_email on public.course_enrollments (lower(buyer_email));

create table if not exists public.course_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists idx_course_progress_user_product on public.course_lesson_progress (user_id, product_id);

create table if not exists public.appointment_availability (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  day_of_week smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time text not null, -- HH:MM
  end_time text not null,   -- HH:MM
  is_active boolean not null default true,
  unique (product_id, day_of_week)
);

create table if not exists public.appointment_bookings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_user_id uuid references public.profiles(id) on delete set null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  booking_date date not null,
  start_time text not null, -- HH:MM
  end_time text not null,   -- HH:MM
  meeting_link text,
  notes text,
  status booking_status not null default 'pending_payment',
  created_at timestamptz not null default now()
);

-- Anti double-booking unique partial index
create unique index if not exists idx_unique_active_booking_slot
  on public.appointment_bookings (product_id, booking_date, start_time)
  where status in ('pending_payment', 'confirmed');

create index if not exists idx_bookings_date on public.appointment_bookings (booking_date, start_time);

create table if not exists public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_user_id uuid references public.profiles(id) on delete set null,
  ticket_code text unique not null,
  attendee_name text not null,
  attendee_email text not null,
  attendee_phone text not null,
  status text not null default 'valid' check (status in ('valid', 'checked_in', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_event_tickets_product on public.event_tickets (product_id);
create index if not exists idx_event_tickets_email on public.event_tickets (lower(attendee_email));

create table if not exists public.membership_subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  buyer_email text not null,
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_membership_email_status on public.membership_subscriptions (lower(buyer_email), status, expires_at desc);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  supporter_name text not null,
  is_anonymous boolean not null default false,
  message text,
  amount numeric(12,2) not null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_donations_product_visible on public.donations (product_id, created_at desc) where is_visible = true;

-- ----------------------------------------------------------------------------
-- 11. AFFILIATE COMMISSIONS & PAYOUTS
-- ----------------------------------------------------------------------------
create table if not exists public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  order_net_amount numeric(12,2) not null,
  commission_pct numeric(5,2) not null,
  commission_amount numeric(12,2) not null,
  status commission_status not null default 'available',
  created_at timestamptz not null default now(),
  unique (affiliate_id, order_id, product_id)
);

create index if not exists idx_aff_commissions_aff_status on public.affiliate_commissions (affiliate_id, status, created_at desc);

create table if not exists public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  bank_name text not null,
  bank_account_number text not null,
  bank_account_holder text not null,
  status payout_status not null default 'requested',
  admin_note text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_aff_payouts_aff_created on public.affiliate_payouts (affiliate_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 12. ANALYTICS & OUTBOUND WEBHOOKS
-- ----------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('page_view', 'product_view', 'link_click', 'checkout_start', 'purchase')),
  product_id uuid references public.products(id) on delete set null,
  block_id uuid references public.bio_blocks(id) on delete set null,
  session_id text,
  referrer text,
  revenue_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_type_created on public.analytics_events (event_type, created_at desc);
create index if not exists idx_analytics_product on public.analytics_events (product_id) where product_id is not null;

create table if not exists public.outbound_webhooks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_url text not null,
  secret_key text not null,
  events text[] not null default '{order.paid}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.outbound_webhooks(id) on delete cascade,
  event_name text not null,
  response_status integer,
  response_body text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_logs_created on public.webhook_logs (webhook_id, created_at desc);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
alter table public.store_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.bio_blocks enable row level security;
alter table public.product_digital_assets enable row level security;
alter table public.product_variants enable row level security;
alter table public.course_sections enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_lesson_progress enable row level security;
alter table public.appointment_availability enable row level security;
alter table public.appointment_bookings enable row level security;
alter table public.event_tickets enable row level security;
alter table public.membership_subscriptions enable row level security;
alter table public.donations enable row level security;
alter table public.vouchers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.affiliates enable row level security;
alter table public.affiliate_clicks enable row level security;
alter table public.affiliate_commissions enable row level security;
alter table public.affiliate_payouts enable row level security;
alter table public.analytics_events enable row level security;
alter table public.outbound_webhooks enable row level security;
alter table public.webhook_logs enable row level security;

-- Public read policies for storefront data
create policy "Public read store_settings" on public.store_settings for select using (true);
create policy "Admin write store_settings" on public.store_settings for all using (public.is_admin());

create policy "Public read published products" on public.products for select using (status = 'published' or public.is_admin());
create policy "Admin write products" on public.products for all using (public.is_admin());

create policy "Public read active bio_blocks" on public.bio_blocks for select using (is_active = true or public.is_admin());
create policy "Admin write bio_blocks" on public.bio_blocks for all using (public.is_admin());

create policy "Public read active variants" on public.product_variants for select using (is_active = true or public.is_admin());
create policy "Admin write variants" on public.product_variants for all using (public.is_admin());

create policy "Public read course_sections" on public.course_sections for select using (true);
create policy "Admin write course_sections" on public.course_sections for all using (public.is_admin());

create policy "Public read course_lessons" on public.course_lessons for select using (true);
create policy "Admin write course_lessons" on public.course_lessons for all using (public.is_admin());

create policy "Public read availability" on public.appointment_availability for select using (true);
create policy "Admin write availability" on public.appointment_availability for all using (public.is_admin());

create policy "Public read visible donations" on public.donations for select using (is_visible = true or public.is_admin());
create policy "Admin write donations" on public.donations for all using (public.is_admin());

-- Profiles
create policy "Own profile read" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "Own profile update" on public.profiles for update using (auth.uid() = id or public.is_admin());

-- Buyer Portal scoped reads
create policy "Buyer read own orders" on public.orders for select using (auth.uid() = buyer_user_id or public.is_admin());
create policy "Admin manage orders" on public.orders for all using (public.is_admin());

create policy "Buyer read own order_items" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_user_id = auth.uid() or public.is_admin()))
);
create policy "Admin manage order_items" on public.order_items for all using (public.is_admin());

create policy "Admin manage digital_assets" on public.product_digital_assets for all using (public.is_admin());
create policy "Buyer read purchased digital_assets" on public.product_digital_assets for select using (
  public.is_admin() or exists (
    select 1 from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = product_digital_assets.product_id
      and o.buyer_user_id = auth.uid()
      and o.payment_status = 'paid'
  )
);

create policy "Buyer read own enrollments" on public.course_enrollments for select using (auth.uid() = user_id or public.is_admin());
create policy "Admin manage enrollments" on public.course_enrollments for all using (public.is_admin());

create policy "Buyer manage own progress" on public.course_lesson_progress for all using (auth.uid() = user_id or public.is_admin());

create policy "Buyer read own bookings" on public.appointment_bookings for select using (auth.uid() = buyer_user_id or public.is_admin());
create policy "Admin manage bookings" on public.appointment_bookings for all using (public.is_admin());

create policy "Buyer read own tickets" on public.event_tickets for select using (auth.uid() = buyer_user_id or public.is_admin());
create policy "Admin manage tickets" on public.event_tickets for all using (public.is_admin());

create policy "Buyer read own memberships" on public.membership_subscriptions for select using (auth.uid() = user_id or public.is_admin());
create policy "Admin manage memberships" on public.membership_subscriptions for all using (public.is_admin());

-- Affiliates
create policy "Affiliate read own record" on public.affiliates for select using (auth.uid() = user_id or public.is_admin());
create policy "Admin manage affiliates" on public.affiliates for all using (public.is_admin());

create policy "Affiliate read own commissions" on public.affiliate_commissions for select using (
  public.is_admin() or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
);
create policy "Admin manage commissions" on public.affiliate_commissions for all using (public.is_admin());

create policy "Affiliate read own payouts" on public.affiliate_payouts for select using (
  public.is_admin() or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
);
create policy "Admin manage payouts" on public.affiliate_payouts for all using (public.is_admin());

-- Admin-only tables
create policy "Admin manage vouchers" on public.vouchers for all using (public.is_admin());
create policy "Admin manage analytics" on public.analytics_events for all using (public.is_admin());
create policy "Admin manage webhooks" on public.outbound_webhooks for all using (public.is_admin());
create policy "Admin manage webhook_logs" on public.webhook_logs for all using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 13. SUPABASE KEEP-ALIVE HEARTBEAT (PREVENTS FREE-TIER AUTO-PAUSE)
-- ----------------------------------------------------------------------------
create table if not exists public.keepalive_heartbeats (
  key text primary key default 'primary',
  source text not null default 'keepalive',
  ping_count bigint not null default 1,
  last_ping_at timestamptz not null default now()
);

alter table public.keepalive_heartbeats enable row level security;
create policy "Admin read keepalive_heartbeats" on public.keepalive_heartbeats
  for select using (public.is_admin());

insert into public.keepalive_heartbeats (key, source, ping_count, last_ping_at)
values ('primary', 'initial-migration', 1, now())
on conflict (key) do update
  set last_ping_at = excluded.last_ping_at,
      ping_count = public.keepalive_heartbeats.ping_count + 1;

-- ----------------------------------------------------------------------------
-- STORAGE BUCKETS
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('public-media', 'public-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('digital-assets', 'digital-assets', false)
on conflict (id) do nothing;

notify pgrst, 'reload schema';

-- Backfill profiles for any pre-existing auth.users (rendyakun50@gmail.com becomes admin)
do $$
declare
  u record;
begin
  for u in (select id, email, raw_user_meta_data from auth.users order by created_at asc) loop
    insert into public.profiles (id, email, full_name, phone, role)
    values (
      u.id,
      coalesce(u.email, ''),
      coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, 'user'), '@', 1)),
      u.raw_user_meta_data ->> 'phone',
      case when lower(coalesce(u.email, '')) = 'rendyakun50@gmail.com' then 'admin'::user_role else 'buyer'::user_role end
    )
    on conflict (id) do update
      set role = case when lower(coalesce(excluded.email, '')) = 'rendyakun50@gmail.com' then 'admin'::user_role else public.profiles.role end;
  end loop;
end $$;

notify pgrst, 'reload schema';
