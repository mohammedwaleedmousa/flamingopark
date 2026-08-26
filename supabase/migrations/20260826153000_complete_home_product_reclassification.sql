-- Complete the Home taxonomy migration for Socks / Belts / Caps.
--
-- Goals:
-- 1) Ensure Home exists as an active top-level category.
-- 2) Ensure canonical child categories exist for Socks, Belts, and Caps.
-- 3) Re-parent any existing matching category rows beneath Home.
-- 4) Reclassify every matching product by product name, including products
--    that were previously attached directly to Accessories or another category.
-- 5) Preserve brands, inventory, prices, images, audience, and all other data.

DO $$
DECLARE
  home_id uuid;
  socks_id uuid;
  belts_id uuid;
  caps_id uuid;
BEGIN
  /* ---------------------------------------------------------
     HOME ROOT
  --------------------------------------------------------- */
  SELECT c.id
    INTO home_id
  FROM public.categories c
  WHERE lower(btrim(c.slug)) = 'home'
     OR lower(btrim(c.name)) = 'home'
     OR btrim(c.name_ar) = 'هوم'
  ORDER BY CASE WHEN lower(btrim(c.slug)) = 'home' THEN 0 ELSE 1 END,
           c.created_at ASC
  LIMIT 1;

  IF home_id IS NULL THEN
    INSERT INTO public.categories (name, name_ar, slug, parent_id, is_active, sort_order)
    VALUES (
      'Home',
      'هوم',
      'home',
      NULL,
      true,
      COALESCE((
        SELECT max(root.sort_order) + 1
        FROM public.categories root
        WHERE root.parent_id IS NULL
      ), 0)
    )
    RETURNING id INTO home_id;
  ELSE
    UPDATE public.categories
    SET name = 'Home',
        name_ar = 'هوم',
        slug = 'home',
        parent_id = NULL,
        is_active = true
    WHERE id = home_id;
  END IF;

  /* ---------------------------------------------------------
     CANONICAL SOCKS CHILD
  --------------------------------------------------------- */
  SELECT c.id
    INTO socks_id
  FROM public.categories c
  WHERE lower(btrim(c.slug)) IN ('sock', 'socks')
     OR lower(btrim(c.name)) IN ('sock', 'socks')
     OR btrim(c.name_ar) IN ('جورب', 'جوارب', 'شراب', 'شرابات')
  ORDER BY CASE WHEN lower(btrim(c.slug)) = 'socks' THEN 0 ELSE 1 END,
           c.created_at ASC
  LIMIT 1;

  IF socks_id IS NULL THEN
    INSERT INTO public.categories (name, name_ar, slug, parent_id, is_active, sort_order)
    VALUES ('Socks', 'جوارب', 'socks', home_id, true, 10)
    RETURNING id INTO socks_id;
  ELSE
    UPDATE public.categories
    SET parent_id = home_id,
        is_active = true
    WHERE id = socks_id;
  END IF;

  /* ---------------------------------------------------------
     CANONICAL BELTS CHILD
  --------------------------------------------------------- */
  SELECT c.id
    INTO belts_id
  FROM public.categories c
  WHERE lower(btrim(c.slug)) IN ('belt', 'belts')
     OR lower(btrim(c.name)) IN ('belt', 'belts')
     OR btrim(c.name_ar) IN ('حزام', 'أحزمة', 'احزمة')
  ORDER BY CASE WHEN lower(btrim(c.slug)) = 'belts' THEN 0 ELSE 1 END,
           c.created_at ASC
  LIMIT 1;

  IF belts_id IS NULL THEN
    INSERT INTO public.categories (name, name_ar, slug, parent_id, is_active, sort_order)
    VALUES ('Belts', 'أحزمة', 'belts', home_id, true, 20)
    RETURNING id INTO belts_id;
  ELSE
    UPDATE public.categories
    SET parent_id = home_id,
        is_active = true
    WHERE id = belts_id;
  END IF;

  /* ---------------------------------------------------------
     CANONICAL CAPS CHILD
  --------------------------------------------------------- */
  SELECT c.id
    INTO caps_id
  FROM public.categories c
  WHERE lower(btrim(c.slug)) IN ('cap', 'caps')
     OR lower(btrim(c.name)) IN ('cap', 'caps')
     OR btrim(c.name_ar) IN ('كاب', 'كابات', 'قبعة', 'قبعات')
  ORDER BY CASE WHEN lower(btrim(c.slug)) = 'caps' THEN 0 ELSE 1 END,
           c.created_at ASC
  LIMIT 1;

  IF caps_id IS NULL THEN
    INSERT INTO public.categories (name, name_ar, slug, parent_id, is_active, sort_order)
    VALUES ('Caps', 'كابات', 'caps', home_id, true, 30)
    RETURNING id INTO caps_id;
  ELSE
    UPDATE public.categories
    SET parent_id = home_id,
        is_active = true
    WHERE id = caps_id;
  END IF;

  /* ---------------------------------------------------------
     MOVE ANY EXISTING MATCHING CATEGORY ROWS UNDER HOME
  --------------------------------------------------------- */
  UPDATE public.categories c
  SET parent_id = home_id
  WHERE c.id <> home_id
    AND (
      lower(btrim(c.slug)) ~ '(^|[-_ ])(sock|socks|belt|belts|cap|caps)([-_ ]|$)'
      OR lower(btrim(c.name)) ~ '(^|[-_ ])(sock|socks|belt|belts|cap|caps)([-_ ]|$)'
      OR btrim(c.name_ar) ~ '(^|[[:space:]/_-])(جورب|جوارب|شراب|شرابات|حزام|أحزمة|احزمة|كاب|كابات|قبعة|قبعات)([[:space:]/_-]|$)'
    );

  /* ---------------------------------------------------------
     PRE-ALLOW ALL TARGET PRODUCT BRANDS FOR CANONICAL CHILDREN
     This keeps the existing product catalog relation trigger satisfied.
  --------------------------------------------------------- */
  INSERT INTO public.brand_categories (brand_id, category_id)
  SELECT DISTINCT p.brand_id, socks_id
  FROM public.products p
  WHERE p.brand_id IS NOT NULL
    AND (
      lower(coalesce(p.name, '')) ~ '(^|[^a-z])(sock|socks)([^a-z]|$)'
      OR coalesce(p.name_ar, '') ~ '(^|[[:space:]/_-])(جورب|جوارب|شراب|شرابات)([[:space:]/_-]|$)'
    )
  ON CONFLICT (brand_id, category_id) DO NOTHING;

  INSERT INTO public.brand_categories (brand_id, category_id)
  SELECT DISTINCT p.brand_id, belts_id
  FROM public.products p
  WHERE p.brand_id IS NOT NULL
    AND (
      lower(coalesce(p.name, '')) ~ '(^|[^a-z])(belt|belts)([^a-z]|$)'
      OR coalesce(p.name_ar, '') ~ '(^|[[:space:]/_-])(حزام|أحزمة|احزمة)([[:space:]/_-]|$)'
    )
  ON CONFLICT (brand_id, category_id) DO NOTHING;

  INSERT INTO public.brand_categories (brand_id, category_id)
  SELECT DISTINCT p.brand_id, caps_id
  FROM public.products p
  WHERE p.brand_id IS NOT NULL
    AND (
      lower(coalesce(p.name, '')) ~ '(^|[^a-z])(cap|caps)([^a-z]|$)'
      OR coalesce(p.name_ar, '') ~ '(^|[[:space:]/_-])(كاب|كابات|قبعة|قبعات)([[:space:]/_-]|$)'
    )
  ON CONFLICT (brand_id, category_id) DO NOTHING;

  /* ---------------------------------------------------------
     RECLASSIFY ALL MATCHING PRODUCTS
     The existing sync_product_catalog_relations trigger updates the legacy
     text category label to the selected category slug automatically.
  --------------------------------------------------------- */
  UPDATE public.products p
  SET category_id = socks_id
  WHERE (
      lower(coalesce(p.name, '')) ~ '(^|[^a-z])(sock|socks)([^a-z]|$)'
      OR coalesce(p.name_ar, '') ~ '(^|[[:space:]/_-])(جورب|جوارب|شراب|شرابات)([[:space:]/_-]|$)'
    )
    AND p.category_id IS DISTINCT FROM socks_id;

  UPDATE public.products p
  SET category_id = belts_id
  WHERE (
      lower(coalesce(p.name, '')) ~ '(^|[^a-z])(belt|belts)([^a-z]|$)'
      OR coalesce(p.name_ar, '') ~ '(^|[[:space:]/_-])(حزام|أحزمة|احزمة)([[:space:]/_-]|$)'
    )
    AND p.category_id IS DISTINCT FROM belts_id;

  UPDATE public.products p
  SET category_id = caps_id
  WHERE (
      lower(coalesce(p.name, '')) ~ '(^|[^a-z])(cap|caps)([^a-z]|$)'
      OR coalesce(p.name_ar, '') ~ '(^|[[:space:]/_-])(كاب|كابات|قبعة|قبعات)([[:space:]/_-]|$)'
    )
    AND p.category_id IS DISTINCT FROM caps_id;
END
$$;
