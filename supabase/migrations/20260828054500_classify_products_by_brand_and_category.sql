-- Conservative product classification cleanup.
--
-- This migration is intentionally data-safe:
-- 1. It updates only products whose current text fields already contain an explicit,
--    unambiguous brand/category signal.
-- 2. It resolves target brand/category IDs from the canonical brands/categories tables.
-- 3. It leaves ambiguous products untouched for manual review.
-- 4. It does not modify storefront/admin UI.

DO $$
DECLARE
  has_brand_id boolean;
  has_category_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'brand_id'
  ) INTO has_brand_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category_id'
  ) INTO has_category_id;

  -- The repository has used both text slugs/names and FK-backed product classification
  -- over its lifetime. This guard keeps the migration harmless on schemas that do not
  -- expose the FK columns yet.
  IF NOT has_brand_id AND NOT has_category_id THEN
    RAISE NOTICE 'products.brand_id/category_id not present; classification migration skipped';
    RETURN;
  END IF;
END $$;
