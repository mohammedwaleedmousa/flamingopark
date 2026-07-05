-- Demo showcase seed: 200 products + orders + finance data
-- Safe to re-run: clears previous DEMO rows before inserting.

DO $$
DECLARE
  i int;
  v_brand text;
  v_category_slug text;
  v_country text;
  v_currency text;
  v_status text;
  v_qty int;
  v_price numeric;
  v_original numeric;
  v_delivery numeric;
  v_discount numeric;
  v_created timestamptz;
  v_delivery_company uuid;
  v_product record;
BEGIN
  -- Cleanup previous demo data (idempotent)
  DELETE FROM public.refunds WHERE refund_number LIKE 'RFD-DEMO-%';
  DELETE FROM public.expenses WHERE description LIKE '[DEMO] %';
  DELETE FROM public.orders WHERE order_number LIKE 'DEMO-ORD-%';
  DELETE FROM public.products WHERE slug LIKE 'demo-product-%';
  DELETE FROM public.delivery_companies WHERE name LIKE 'Demo Shipping %';
  DELETE FROM public.categories WHERE slug LIKE 'demo-cat-%';
  DELETE FROM public.brands WHERE name LIKE 'Demo Brand %';

  -- Demo brands
  FOR i IN 1..20 LOOP
    INSERT INTO public.brands(name, logo_url, countries, is_active, sort_order)
    VALUES (
      format('Demo Brand %s', i),
      format('https://picsum.photos/seed/demo-brand-%s/240/240', i),
      ARRAY['GLOBAL','SA','YE'],
      true,
      i
    );
  END LOOP;

  -- Demo categories
  FOR i IN 1..12 LOOP
    INSERT INTO public.categories(name, name_ar, slug, image_url, is_active, sort_order, countries)
    VALUES (
      format('Demo Category %s', i),
      format('قسم تجريبي %s', i),
      format('demo-cat-%s', lpad(i::text, 2, '0')),
      format('https://picsum.photos/seed/demo-cat-%s/640/640', i),
      true,
      i,
      ARRAY['GLOBAL','SA','YE']
    );
  END LOOP;

  -- Demo delivery companies
  FOR i IN 1..3 LOOP
    INSERT INTO public.delivery_companies(name, country, base_fee, delivery_days, is_active)
    VALUES (format('Demo Shipping YE %s', i), 'YE', (5 + i * 2), format('%s-%s أيام', 2 + i, 4 + i), true);

    INSERT INTO public.delivery_companies(name, country, base_fee, delivery_days, is_active)
    VALUES (format('Demo Shipping SA %s', i), 'SA', (12 + i * 3), format('%s-%s days', 2 + i, 5 + i), true);
  END LOOP;

  -- 200 demo products with colors/sizes/images/accessories
  FOR i IN 1..200 LOOP
    SELECT name INTO v_brand
    FROM public.brands
    WHERE name LIKE 'Demo Brand %'
    ORDER BY random()
    LIMIT 1;

    SELECT slug INTO v_category_slug
    FROM public.categories
    WHERE slug LIKE 'demo-cat-%'
    ORDER BY random()
    LIMIT 1;

    v_price := round((80 + random() * 1400)::numeric, 2);
    v_original := round((v_price * (1.08 + random() * 0.35))::numeric, 2);

    INSERT INTO public.products(
      name,
      name_ar,
      slug,
      price,
      original_price,
      discount,
      description,
      description_ar,
      images,
      category,
      brand,
      in_stock,
      countries,
      is_featured,
      is_best_seller,
      is_active,
      has_sizes,
      sizes,
      color_variants,
      features,
      accessories,
      sort_order
    )
    VALUES (
      format('Demo Product %s', i),
      format('منتج تجريبي رقم %s', i),
      format('demo-product-%s', lpad(i::text, 3, '0')),
      v_price,
      v_original,
      floor(random() * 35)::int,
      format('Demo product description %s for showcase and client review.', i),
      format('وصف منتج تجريبي رقم %s للعرض أمام العميل.', i),
      ARRAY[
        format('https://picsum.photos/seed/demo-product-%s-a/900/1100', i),
        format('https://picsum.photos/seed/demo-product-%s-b/900/1100', i),
        format('https://picsum.photos/seed/demo-product-%s-c/900/1100', i)
      ],
      coalesce(v_category_slug, 'demo-cat-01'),
      coalesce(v_brand, 'Demo Brand 1'),
      true,
      ARRAY['GLOBAL','SA','YE'],
      (i % 9 = 0),
      (i % 7 = 0),
      true,
      true,
      ARRAY['S','M','L','XL'],
      jsonb_build_array(
        jsonb_build_object('name', 'Black', 'hex', '#111827', 'images', jsonb_build_array(format('https://picsum.photos/seed/demo-product-%s-black/900/1100', i))),
        jsonb_build_object('name', 'White', 'hex', '#E5E7EB', 'images', jsonb_build_array(format('https://picsum.photos/seed/demo-product-%s-white/900/1100', i))),
        jsonb_build_object('name', 'Rose', 'hex', '#F43F5E', 'images', jsonb_build_array(format('https://picsum.photos/seed/demo-product-%s-rose/900/1100', i)))
      ),
      jsonb_build_array(
        jsonb_build_object('icon', 'truck', 'title', 'توصيل سريع', 'desc', 'خلال 2-5 أيام'),
        jsonb_build_object('icon', 'shield', 'title', 'جودة مضمونة', 'desc', 'منتج تجريبي عالي الجودة')
      ),
      jsonb_build_array(
        jsonb_build_object('name', 'Gift Box', 'name_ar', 'علبة هدية', 'price', 15, 'quantity', 1, 'image_url', format('https://picsum.photos/seed/demo-acc-%s/300/300', i))
      ),
      i
    );
  END LOOP;

  -- Demo orders (for storefront + analytics + finance)
  FOR i IN 1..150 LOOP
    SELECT id, name_ar, price, images INTO v_product
    FROM public.products
    WHERE slug LIKE 'demo-product-%'
    ORDER BY random()
    LIMIT 1;

    v_qty := 1 + floor(random() * 3)::int;
    v_country := CASE WHEN random() < 0.5 THEN 'YE' ELSE 'SA' END;
    v_currency := CASE
      WHEN random() < 0.34 THEN 'SAR'
      WHEN random() < 0.67 THEN 'YER_SOUTH'
      ELSE 'YER_NORTH'
    END;

    v_status := CASE
      WHEN random() < 0.18 THEN 'pending'
      WHEN random() < 0.34 THEN 'confirmed'
      WHEN random() < 0.56 THEN 'processing'
      WHEN random() < 0.78 THEN 'shipped'
      WHEN random() < 0.94 THEN 'delivered'
      ELSE 'cancelled'
    END;

    v_delivery := round((5 + random() * 35)::numeric, 2);
    v_discount := CASE WHEN random() < 0.25 THEN round((random() * 25)::numeric, 2) ELSE 0 END;
    v_created := now()
      - ((random() * 120)::int || ' days')::interval
      - ((random() * 23)::int || ' hours')::interval;

    SELECT id INTO v_delivery_company
    FROM public.delivery_companies
    WHERE country = v_country AND is_active IS TRUE
    ORDER BY random()
    LIMIT 1;

    INSERT INTO public.orders(
      order_number,
      customer_name,
      customer_phone,
      customer_address,
      customer_notes,
      country,
      currency_mode,
      items,
      subtotal,
      delivery_fee,
      discount_amount,
      total,
      delivery_company_id,
      payment_method,
      status,
      created_at,
      updated_at
    )
    VALUES (
      format('DEMO-ORD-%s', lpad(i::text, 5, '0')),
      format('عميل تجريبي %s', i),
      format('%s', 700000000 + (floor(random() * 9999999))::int),
      format('عنوان تجريبي %s - حي %s', i, 1 + (i % 12)),
      '[DEMO] طلب تم إنشاؤه للعرض',
      v_country,
      v_currency,
      jsonb_build_array(
        jsonb_build_object(
          'product_id', v_product.id,
          'product_name', coalesce(v_product.name_ar, 'منتج تجريبي'),
          'product_image', coalesce((v_product.images)[1], ''),
          'quantity', v_qty,
          'price', round((v_product.price)::numeric, 2),
          'selected_size', (ARRAY['S','M','L','XL'])[1 + floor(random() * 4)::int],
          'selected_accessories', '[]'::jsonb
        )
      ),
      round((v_product.price * v_qty)::numeric, 2),
      v_delivery,
      v_discount,
      greatest(round((v_product.price * v_qty + v_delivery - v_discount)::numeric, 2), 1),
      v_delivery_company,
      CASE WHEN random() < 0.7 THEN 'cod' ELSE 'bank' END,
      v_status,
      v_created,
      v_created + ((1 + floor(random() * 48))::text || ' hours')::interval
    );
  END LOOP;

  -- Demo expenses to populate finance dashboard
  FOR i IN 1..90 LOOP
    INSERT INTO public.expenses(amount, description, vendor, notes, expense_date, currency_mode)
    VALUES (
      round((30 + random() * 1400)::numeric, 2),
      format('[DEMO] مصروف تشغيلي رقم %s', i),
      (ARRAY['Logistics Co','Marketing Hub','Packaging House','Freelancer'])[1 + floor(random() * 4)::int],
      'بيانات مالية تجريبية للعرض',
      now() - ((random() * 120)::int || ' days')::interval,
      (ARRAY['SAR','YER_SOUTH','YER_NORTH'])[1 + floor(random() * 3)::int]
    );
  END LOOP;

  -- Demo refunds linked to demo orders
  INSERT INTO public.refunds(
    amount,
    reason,
    refund_method,
    refund_number,
    status,
    order_id,
    order_number,
    customer_name,
    customer_phone,
    items,
    notes,
    created_at,
    updated_at,
    processed_at
  )
  SELECT
    round((greatest(o.total, 10) * (0.1 + random() * 0.35))::numeric, 2),
    'إرجاع تجريبي',
    CASE WHEN random() < 0.5 THEN 'cash' ELSE 'bank' END,
    format('RFD-DEMO-%s', lpad(row_number() OVER ()::text, 5, '0')),
    'processed',
    o.id,
    o.order_number,
    o.customer_name,
    o.customer_phone,
    '[]'::jsonb,
    '[DEMO] مردود مالي تجريبي',
    o.created_at + interval '1 day',
    o.created_at + interval '2 days',
    o.created_at + interval '2 days'
  FROM (
    SELECT *
    FROM public.orders
    WHERE order_number LIKE 'DEMO-ORD-%'
    ORDER BY random()
    LIMIT 30
  ) o;
END $$;
