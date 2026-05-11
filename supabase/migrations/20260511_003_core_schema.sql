-- ============================================
-- CORE SCHEMA: 16 tables (ai_knowledge and analytics_events already created)
-- Sub-Phase B: Tasks 4-9
-- ============================================

-- ============================================
-- 1. PROFILES
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  phone text,
  avatar_url text,
  role text default 'customer' check (role in ('customer', 'admin', 'moderator', 'assistant')),
  theme_preference text default 'system' check (theme_preference in ('light', 'dark', 'system')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 2. ADDRESSES
-- ============================================
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  full_name text not null,
  phone text not null,
  city text not null,
  district text not null,
  neighborhood text,
  street text,
  detailed_address text,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- 3. CATEGORIES
-- ============================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  parent_id uuid references public.categories(id) on delete set null,
  icon_url text,
  display_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- 4. PRODUCTS
-- ============================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_description text,
  long_description text,
  technical_specs jsonb,
  category_id uuid references public.categories(id),
  brand text,
  supplier_url text,
  supplier_price numeric(10,2),
  markup_percentage numeric(5,2) default 25,
  current_price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  stock_quantity int default 0,
  low_stock_threshold int default 3,
  is_in_stock boolean generated always as (stock_quantity > 0) stored,
  badges jsonb default '[]'::jsonb,
  is_active boolean default true,
  is_featured boolean default false,
  is_new_arrival boolean default false,
  meta_title text,
  meta_description text,
  last_supplier_check timestamptz,
  supplier_sync_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_featured on public.products(is_featured) where is_featured = true;
create index if not exists idx_products_in_stock on public.products(is_in_stock) where is_in_stock = true;

-- ============================================
-- 5. PRODUCT MEDIA
-- ============================================
create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video', 'pdf')),
  url text not null,
  thumbnail_url text,
  alt_text text,
  display_order int default 0,
  file_size_kb int,
  created_at timestamptz default now()
);

create index if not exists idx_product_media on public.product_media(product_id, display_order);

-- ============================================
-- 6. CAMPAIGNS
-- ============================================
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  banner_image_url text,
  rule_type text not null check (rule_type in (
    'percent_off',
    'buy_x_get_y_discount',
    'bundle_discount',
    'free_shipping',
    'fixed_amount_off'
  )),
  rule_config jsonb not null,
  applicable_to text default 'all' check (applicable_to in ('all', 'category', 'product')),
  target_ids uuid[],
  start_date timestamptz not null,
  end_date timestamptz,
  is_active boolean default true,
  display_on_homepage boolean default false,
  display_priority int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_campaigns_active on public.campaigns(is_active, start_date, end_date);

-- ============================================
-- 7. OFFERS
-- ============================================
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  city text not null,
  district text not null,
  installation_location text check (installation_location in ('roof', 'land', 'other')),
  installation_address text,
  appliances_to_run jsonb,
  detailed_description text,
  phone text not null,
  email text,
  status text default 'new' check (status in ('new', 'in_review', 'responded', 'closed')),
  admin_notes text,
  admin_response text,
  responded_by uuid references public.profiles(id),
  responded_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_offers_status on public.offers(status);
create index if not exists idx_offers_created on public.offers(created_at desc);

-- ============================================
-- 8. OFFER MEDIA
-- ============================================
create table if not exists public.offer_media (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video', 'document')),
  url text not null,
  file_size_kb int,
  created_at timestamptz default now()
);

-- ============================================
-- 9. ORDERS
-- ============================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  user_id uuid references public.profiles(id) on delete set null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  shipping_cost numeric(10,2) default 0,
  discount_amount numeric(10,2) default 0,
  applied_campaigns uuid[],
  total numeric(10,2) not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  shipping_address jsonb not null,
  status text default 'pending' check (status in (
    'pending',
    'whatsapp_sent',
    'confirmed',
    'preparing',
    'shipped',
    'delivered',
    'cancelled'
  )),
  payment_method text default 'whatsapp' check (payment_method in ('whatsapp', 'iyzico', 'bank_transfer')),
  payment_status text default 'pending',
  payment_reference text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 10. GALLERY POSTS
-- ============================================
create table if not exists public.gallery_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  long_description text,
  location text,
  installation_date date,
  system_power_kw numeric(8,2),
  client_name text,
  is_featured boolean default false,
  display_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- 11. GALLERY MEDIA
-- ============================================
create table if not exists public.gallery_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.gallery_posts(id) on delete cascade,
  media_type text check (media_type in ('image', 'video')),
  url text not null,
  thumbnail_url text,
  caption text,
  display_order int default 0
);

-- ============================================
-- 12. STOCK NOTIFICATIONS
-- ============================================
create table if not exists public.stock_notifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  email text not null,
  phone text,
  push_subscription jsonb,
  is_notified boolean default false,
  notified_at timestamptz,
  created_at timestamptz default now(),
  unique(product_id, email)
);

-- ============================================
-- 13. ADMIN NOTIFICATIONS
-- ============================================
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'new_offer',
    'new_order',
    'low_stock',
    'supplier_price_up',
    'supplier_price_down',
    'product_unavailable',
    'new_review',
    'system'
  )),
  title text not null,
  message text,
  related_id uuid,
  related_type text,
  is_read boolean default false,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_admin_notif_unread on public.admin_notifications(is_read, created_at desc) where is_read = false;

-- ============================================
-- 14. FAQs
-- ============================================
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  display_order int default 0,
  is_active boolean default true,
  view_count int default 0,
  created_at timestamptz default now()
);

-- ============================================
-- 15. AI CONVERSATIONS
-- ============================================
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 16. SITE SETTINGS
-- ============================================
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz default now(),
  updated_by uuid references public.profiles(id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.categories enable row level security;
alter table public.campaigns enable row level security;
alter table public.gallery_posts enable row level security;
alter table public.gallery_media enable row level security;
alter table public.offers enable row level security;
alter table public.offer_media enable row level security;
alter table public.orders enable row level security;
alter table public.stock_notifications enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.site_settings enable row level security;
alter table public.faqs enable row level security;
alter table public.addresses enable row level security;

-- Helper: is_admin() — reads role from profiles for current auth.uid()
create or replace function public.is_admin() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'moderator')
  );
$$ language sql security definer stable;

-- Profiles
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select using (auth.uid() = id or public.is_admin());
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all" on public.profiles for all using (public.is_admin());

-- Public read tables
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select using (is_active = true);
drop policy if exists "product_media public read" on public.product_media;
create policy "product_media public read" on public.product_media for select using (true);
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select using (is_active = true);
drop policy if exists "campaigns public read" on public.campaigns;
create policy "campaigns public read" on public.campaigns for select using (is_active = true);
drop policy if exists "gallery_posts public read" on public.gallery_posts;
create policy "gallery_posts public read" on public.gallery_posts for select using (is_active = true);
drop policy if exists "gallery_media public read" on public.gallery_media;
create policy "gallery_media public read" on public.gallery_media for select using (true);
drop policy if exists "site_settings public read" on public.site_settings;
create policy "site_settings public read" on public.site_settings for select using (true);
drop policy if exists "faqs public read" on public.faqs;
create policy "faqs public read" on public.faqs for select using (is_active = true);

-- Admin-only write tables
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products for all using (public.is_admin());
drop policy if exists "product_media admin write" on public.product_media;
create policy "product_media admin write" on public.product_media for all using (public.is_admin());
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories for all using (public.is_admin());
drop policy if exists "campaigns admin write" on public.campaigns;
create policy "campaigns admin write" on public.campaigns for all using (public.is_admin());
drop policy if exists "gallery_posts admin write" on public.gallery_posts;
create policy "gallery_posts admin write" on public.gallery_posts for all using (public.is_admin());
drop policy if exists "gallery_media admin write" on public.gallery_media;
create policy "gallery_media admin write" on public.gallery_media for all using (public.is_admin());
drop policy if exists "site_settings admin write" on public.site_settings;
create policy "site_settings admin write" on public.site_settings for all using (public.is_admin());

-- Offers
drop policy if exists "offers anon insert" on public.offers;
create policy "offers anon insert" on public.offers for insert with check (true);
drop policy if exists "offers admin read" on public.offers;
create policy "offers admin read" on public.offers for select using (public.is_admin() or (user_id is not null and auth.uid() = user_id));
drop policy if exists "offers admin update" on public.offers;
create policy "offers admin update" on public.offers for update using (public.is_admin());
drop policy if exists "offer_media anon insert" on public.offer_media;
create policy "offer_media anon insert" on public.offer_media for insert with check (true);
drop policy if exists "offer_media read" on public.offer_media;
create policy "offer_media read" on public.offer_media for select using (public.is_admin());

-- Orders
drop policy if exists "orders anon insert" on public.orders;
create policy "orders anon insert" on public.orders for insert with check (true);
drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders for select using (public.is_admin() or (user_id is not null and auth.uid() = user_id));
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders for update using (public.is_admin());

-- Stock notifications
drop policy if exists "stock_notif anon insert" on public.stock_notifications;
create policy "stock_notif anon insert" on public.stock_notifications for insert with check (true);
drop policy if exists "stock_notif admin all" on public.stock_notifications;
create policy "stock_notif admin all" on public.stock_notifications for all using (public.is_admin());

-- Admin notifications
drop policy if exists "admin_notif admin all" on public.admin_notifications;
create policy "admin_notif admin all" on public.admin_notifications for all using (public.is_admin());

-- Addresses (user owns their own)
drop policy if exists "addresses self all" on public.addresses;
create policy "addresses self all" on public.addresses for all using (auth.uid() = user_id);
drop policy if exists "addresses admin all" on public.addresses;
create policy "addresses admin all" on public.addresses for all using (public.is_admin());

-- ============================================
-- STORAGE BUCKETS
-- ============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-media', 'product-media', true, 10485760,
    array['image/jpeg','image/png','image/webp','image/avif','video/mp4','application/pdf']),
  ('gallery-media', 'gallery-media', true, 10485760,
    array['image/jpeg','image/png','image/webp','image/avif','video/mp4']),
  ('offer-media', 'offer-media', false, 10485760,
    array['image/jpeg','image/png','image/webp','image/avif','video/mp4','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "public buckets read" on storage.objects;
create policy "public buckets read" on storage.objects
  for select using (bucket_id in ('product-media','gallery-media'));

drop policy if exists "admin storage write" on storage.objects;
create policy "admin storage write" on storage.objects
  for all using (public.is_admin());

drop policy if exists "offer-media anon insert" on storage.objects;
create policy "offer-media anon insert" on storage.objects
  for insert with check (bucket_id = 'offer-media');

drop policy if exists "offer-media admin read" on storage.objects;
create policy "offer-media admin read" on storage.objects
  for select using (bucket_id = 'offer-media' and public.is_admin());

-- ============================================
-- INITIAL site_settings ROWS
-- ============================================

insert into public.site_settings (key, value) values
  ('contact_phone', '"+90 555 555 55 55"'::jsonb),
  ('contact_email', '"info@kayhansolar.com"'::jsonb),
  ('whatsapp_number', '"905555555555"'::jsonb),
  ('address', '{"city":"Diyarbakır","full":"KAYHAN Solar & Enerji — Diyarbakır, Türkiye","mapsUrl":"https://maps.google.com/?q=Diyarbakir"}'::jsonb),
  ('social_media', '{"instagram":"https://instagram.com/kayhansolar","facebook":"https://facebook.com/kayhansolar","youtube":"https://youtube.com/@kayhansolar"}'::jsonb)
on conflict (key) do nothing;

-- ============================================
-- updated_at TRIGGERS
-- ============================================

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
