-- Add badge-source fields to products table
-- Replaces the manual badges[] array with derived fields (in code)

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS has_free_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS warranty_years INT NULL;

-- Backfill from existing badges JSONB array (idempotent)
UPDATE products
  SET has_free_shipping = TRUE
  WHERE badges @> '"kargo_bedava"' AND has_free_shipping = FALSE;

UPDATE products
  SET warranty_years = 5
  WHERE badges @> '"5_yil_garanti"' AND warranty_years IS DISTINCT FROM 5;

UPDATE products
  SET warranty_years = 10
  WHERE badges @> '"10_yil_garanti"' AND warranty_years IS DISTINCT FROM 10;

-- Note: 'yeni' and 'tercih_edilen' already have backing columns
-- (is_new_arrival, is_featured); 'stokta_son' is computed at read time;
-- no backfill needed for those.
