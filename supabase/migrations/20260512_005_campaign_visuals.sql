-- 20260512_005_campaign_visuals.sql
-- Anasayfa kampanya slider'ı için görsel + CTA alanları ekler.
-- banner_image_url mevcut, dokunulmuyor (ileride mini banner için saklı).

alter table public.campaigns
  add column if not exists cover_image_url     text,
  add column if not exists cta_label           text,
  add column if not exists cta_secondary_label text;

comment on column public.campaigns.cover_image_url is
  'Anasayfa slider tam genişlik görseli. NULL ise kampanya slider''da gösterilmez.';
comment on column public.campaigns.cta_label is
  'Primary CTA buton metni. NULL ise UI''da default "Detayları Gör" gösterilir.';
comment on column public.campaigns.cta_secondary_label is
  'İkincil CTA metni. NULL ise ikinci buton hiç gösterilmez.';
