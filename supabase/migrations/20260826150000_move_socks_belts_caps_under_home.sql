-- Create a new top-level Home category and group the existing
-- socks, belts, and caps categories beneath it.
--
-- This intentionally changes category hierarchy only. Products already linked
-- to these categories keep their category_id, brand, inventory, and all other
-- product data unchanged while becoming part of Home instead of Accessories.

DO $$
DECLARE
  home_category_id uuid;
BEGIN
  SELECT c.id
    INTO home_category_id
  FROM public.categories c
  WHERE lower(btrim(c.slug)) = 'home'
     OR lower(btrim(c.name)) = 'home'
     OR btrim(c.name_ar) = 'هوم'
  ORDER BY CASE WHEN lower(btrim(c.slug)) = 'home' THEN 0 ELSE 1 END,
           c.created_at ASC
  LIMIT 1;

  IF home_category_id IS NULL THEN
    INSERT INTO public.categories (
      name,
      name_ar,
      slug,
      parent_id,
      is_active,
      sort_order
    )
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
    RETURNING id INTO home_category_id;
  ELSE
    UPDATE public.categories
    SET name = 'Home',
        name_ar = 'هوم',
        slug = 'home',
        parent_id = NULL,
        is_active = true
    WHERE id = home_category_id;
  END IF;

  -- Re-parent existing Socks / Belts / Caps categories from wherever they are
  -- (including Accessories) to Home. Exact words and slug tokens are used to
  -- avoid moving unrelated categories whose names merely contain "cap", etc.
  UPDATE public.categories c
  SET parent_id = home_category_id
  WHERE c.id <> home_category_id
    AND (
      lower(btrim(c.slug)) ~ '(^|[-_ ])(sock|socks|belt|belts|cap|caps)([-_ ]|$)'
      OR lower(btrim(c.name)) ~ '(^|[-_ ])(sock|socks|belt|belts|cap|caps)([-_ ]|$)'
      OR btrim(c.name_ar) ~ '(^|[[:space:]/_-])(جورب|جوارب|شراب|شرابات|حزام|أحزمة|احزمة|كاب|كابات)([[:space:]/_-]|$)'
    );
END
$$;
