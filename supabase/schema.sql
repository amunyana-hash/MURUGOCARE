-- URUGOCARE — Home & Family Management Platform
-- Supabase schema: tables, indexes and row level security.
-- Run once in the SQL editor of a fresh Supabase project, then set
-- SUPABASE_URL and SUPABASE_ANON_KEY in the app environment.
-- With those variables present the app reads/writes Supabase instead of the
-- browser demo store (see src/lib/supabase.ts).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null default 'customer' check (role in ('customer', 'provider', 'admin')),
  full_name text not null,
  email text not null unique,
  phone text,
  country text,
  city text,
  district text default 'Bugesera',
  language text default 'en' check (language in ('en', 'fr', 'rw')),
  is_diaspora boolean default false,
  avatar_color text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- providers
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_fr text not null,
  name_rw text not null,
  tagline_en text, tagline_fr text, tagline_rw text,
  description_en text, description_fr text, description_rw text,
  icon text,
  base_price integer default 0,
  sort_order integer default 0
);

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  full_name text not null,
  business_name text not null,
  category_slugs text[] not null default '{}',
  skills text[] not null default '{}',
  bio text default '',
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected', 'suspended')),
  rating numeric(3, 2) default 0,
  reviews_count integer default 0,
  jobs_completed integer default 0,
  hourly_rate integer default 0,
  district text default 'Bugesera',
  sector text,
  phone text,
  email text,
  languages text[] not null default '{}',
  id_document text,
  certificate text,
  years_experience integer default 0,
  available boolean default true,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists providers_user_idx on public.providers (user_id);
create index if not exists providers_status_idx on public.providers (verification_status);

-- ------------------------------------------------------------ family desk
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  address text not null,
  sector text,
  district text default 'Bugesera',
  property_type text,
  bedrooms integer,
  caretaker_name text,
  caretaker_phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  full_name text not null,
  relationship text,
  age integer,
  phone text,
  care_needs text,
  notes text,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  customer_name text not null,
  provider_id uuid references public.providers (id) on delete set null,
  provider_name text,
  category_slug text not null,
  category_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  scheduled_date date not null,
  time_slot text not null,
  address text not null,
  district text default 'Bugesera',
  sector text,
  notes text,
  amount integer default 0,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'failed')),
  payment_method text check (payment_method in ('mtn_momo', 'airtel_money', 'bank_transfer', 'card', 'cash')),
  for_family boolean default false,
  property_id uuid references public.properties (id) on delete set null,
  family_member_id uuid references public.family_members (id) on delete set null,
  recurring text,
  photo_report_requested boolean default false,
  completion_report text,
  media_urls text[] default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bookings_customer_idx on public.bookings (customer_id);
create index if not exists bookings_provider_idx on public.bookings (provider_id);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  provider_name text not null,
  amount integer not null check (amount > 0),
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now()
);
create index if not exists quotations_booking_idx on public.quotations (booking_id);
create index if not exists quotations_provider_idx on public.quotations (provider_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_ref text not null,
  customer_id uuid references public.profiles (id) on delete set null,
  customer_name text not null,
  description text,
  method text not null check (method in ('mtn_momo', 'airtel_money', 'bank_transfer', 'card', 'cash')),
  provider_ref text,
  amount integer not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);
create index if not exists payments_customer_idx on public.payments (customer_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings (id) on delete set null,
  provider_id uuid not null references public.providers (id) on delete cascade,
  provider_name text not null,
  customer_id uuid references public.profiles (id) on delete set null,
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  reply text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_provider_idx on public.reviews (provider_id);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  customer_name text not null,
  booking_id uuid references public.bookings (id) on delete set null,
  booking_ref text,
  subject text not null,
  message text not null,
  category text,
  priority text default 'normal' check (priority in ('low', 'normal', 'urgent')),
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved')),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists complaints_customer_idx on public.complaints (customer_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  audience text,
  title text not null,
  body text,
  kind text default 'system',
  link text,
  read boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read);

create table if not exists public.care_reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete cascade,
  family_member_id uuid references public.family_members (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  title text not null,
  summary text not null,
  media_urls text[] default '{}',
  care_rating integer check (care_rating between 1 and 5),
  created_at timestamptz not null default now()
);
create index if not exists care_reports_owner_idx on public.care_reports (owner_id);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  price_rwf integer not null check (price_rwf >= 0),
  interval text not null default 'month' check (interval in ('month', 'year')),
  features text[] not null default '{}',
  best_for text,
  popular boolean default false
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  customer_name text not null,
  plan_slug text not null,
  plan_name text not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired', 'trial')),
  price integer not null default 0,
  started_at date not null default current_date,
  renews_at date,
  payment_method text check (payment_method in ('mtn_momo', 'airtel_money', 'bank_transfer', 'card', 'cash')),
  auto_renew boolean default true
);
create index if not exists subscriptions_customer_idx on public.subscriptions (customer_id);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  country text,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'replied')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ helpers
create or replace function public.current_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- --------------------------------------------------------------------- RLS
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.providers         enable row level security;
alter table public.properties        enable row level security;
alter table public.family_members    enable row level security;
alter table public.bookings          enable row level security;
alter table public.quotations        enable row level security;
alter table public.payments          enable row level security;
alter table public.reviews           enable row level security;
alter table public.complaints        enable row level security;
alter table public.notifications     enable row level security;
alter table public.care_reports      enable row level security;
alter table public.plans             enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.contact_messages  enable row level security;

-- profiles: self service, admins see everyone
create policy "profiles read own"     on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles update own"   on public.profiles for update using (auth.uid() = id or public.is_admin());
create policy "profiles insert self"  on public.profiles for insert with check (auth.uid() = id);

-- public catalogue
create policy "categories public read" on public.categories for select using (true);
create policy "categories admin write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy "plans public read"      on public.plans for select using (true);
create policy "plans admin write"      on public.plans for all using (public.is_admin()) with check (public.is_admin());

-- providers: verified profiles are public, owners manage their row
create policy "providers public read"  on public.providers for select using (true);
create policy "providers self write"   on public.providers for update using (auth.uid() = user_id or public.is_admin());
create policy "providers self insert"  on public.providers for insert with check (auth.uid() = user_id or public.is_admin());
create policy "providers admin delete" on public.providers for delete using (public.is_admin());

-- family desk
create policy "properties owner read"  on public.properties for select using (auth.uid() = owner_id or public.is_admin());
create policy "properties owner write" on public.properties for all using (auth.uid() = owner_id or public.is_admin()) with check (auth.uid() = owner_id or public.is_admin());

create policy "family owner read"      on public.family_members for select using (auth.uid() = owner_id or public.is_admin());
create policy "family owner write"     on public.family_members for all using (auth.uid() = owner_id or public.is_admin()) with check (auth.uid() = owner_id or public.is_admin());

create policy "reports owner read"     on public.care_reports for select using (auth.uid() = owner_id or public.is_admin());
create policy "reports owner write"    on public.care_reports for all using (auth.uid() = owner_id or public.is_admin()) with check (auth.uid() = owner_id or public.is_admin());

-- bookings: customer, assigned provider and admin
create policy "bookings participant read" on public.bookings for select using (
  auth.uid() = customer_id
  or public.is_admin()
  or exists (select 1 from public.providers p where p.id = bookings.provider_id and p.user_id = auth.uid())
);
create policy "bookings customer create" on public.bookings for insert with check (auth.uid() = customer_id);
create policy "bookings participant update" on public.bookings for update using (
  auth.uid() = customer_id
  or public.is_admin()
  or exists (select 1 from public.providers p where p.id = bookings.provider_id and p.user_id = auth.uid())
);

-- quotations: providers quote, customer of the booking accepts
create policy "quotations participant read" on public.quotations for select using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = quotations.provider_id and p.user_id = auth.uid())
  or exists (select 1 from public.bookings b where b.id = quotations.booking_id and b.customer_id = auth.uid())
);
create policy "quotations provider insert" on public.quotations for insert with check (
  exists (select 1 from public.providers p where p.id = quotations.provider_id and p.user_id = auth.uid())
);
create policy "quotations participant update" on public.quotations for update using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = quotations.provider_id and p.user_id = auth.uid())
  or exists (select 1 from public.bookings b where b.id = quotations.booking_id and b.customer_id = auth.uid())
);

-- payments and subscriptions
create policy "payments owner read"   on public.payments for select using (auth.uid() = customer_id or public.is_admin());
create policy "payments owner insert" on public.payments for insert with check (auth.uid() = customer_id or public.is_admin());
create policy "payments admin update" on public.payments for update using (public.is_admin());

create policy "subs owner read"   on public.subscriptions for select using (auth.uid() = customer_id or public.is_admin());
create policy "subs owner write"  on public.subscriptions for all using (auth.uid() = customer_id or public.is_admin()) with check (auth.uid() = customer_id or public.is_admin());

-- reviews: written by the customer of a completed booking
create policy "reviews public read"    on public.reviews for select using (true);
create policy "reviews customer write" on public.reviews for insert with check (auth.uid() = customer_id or public.is_admin());
create policy "reviews participant update" on public.reviews for update using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = reviews.provider_id and p.user_id = auth.uid())
);

-- complaints
create policy "complaints owner read"  on public.complaints for select using (auth.uid() = customer_id or public.is_admin());
create policy "complaints owner write" on public.complaints for insert with check (auth.uid() = customer_id);
create policy "complaints admin update" on public.complaints for update using (public.is_admin());

-- notifications are private to their recipient
create policy "notifications owner read"   on public.notifications for select using (auth.uid() = user_id or public.is_admin());
create policy "notifications owner write"  on public.notifications for insert with check (auth.uid() = user_id or public.is_admin());
create policy "notifications owner update" on public.notifications for update using (auth.uid() = user_id or public.is_admin());

-- contact form: anyone may submit, only admins read
create policy "contact public insert" on public.contact_messages for insert with check (true);
create policy "contact admin read"    on public.contact_messages for select using (public.is_admin());
create policy "contact admin update"  on public.contact_messages for update using (public.is_admin());

-- ---------------------------------------------------- new user bootstrap
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
