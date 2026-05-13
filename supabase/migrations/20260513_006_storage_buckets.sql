-- 20260513_006_storage_buckets.sql
-- Faz 6 production prep: Supabase Storage bucket'ları + RLS policy'leri.
-- product-media + gallery-media: public okuma (mağaza + galeri).
-- offer-media: tamamen private (sadece admin görür — teklif başvurusu görselleri).

-- ============================================
-- 1. Bucket'ları oluştur / güncelle (idempotent)
-- ============================================
insert into storage.buckets (id, name, public)
values
  ('product-media', 'product-media', true),
  ('gallery-media', 'gallery-media', true),
  ('offer-media',   'offer-media',   false)
on conflict (id) do update set public = excluded.public;

-- ============================================
-- 2. Mevcut policy'leri temizle (re-run safety)
-- ============================================
drop policy if exists "Public read product-media" on storage.objects;
drop policy if exists "Public read gallery-media" on storage.objects;

-- ============================================
-- 3. Public bucket'lar için anon + authenticated SELECT
-- ============================================
-- Not: bucket.public=true zaten public URL endpoint'ini açar; bu policy
-- defense-in-depth (Supabase Storage REST API doğrudan kullanıldığında geçerli).
-- INSERT/UPDATE/DELETE her bucket için service_role üzerinden yapılır
-- (lib/supabase/admin.ts) — service_role RLS'i bypass eder, ek policy gerekmiyor.

create policy "Public read product-media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-media');

create policy "Public read gallery-media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery-media');

-- ============================================
-- 4. offer-media: hiçbir public policy yok
-- ============================================
-- storage.objects RLS açık (Supabase default). anon/authenticated için policy
-- yokluğu = default deny. Sadece service_role erişebilir (RLS bypass).
