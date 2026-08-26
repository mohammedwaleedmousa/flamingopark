-- Assign the existing Louis Vuitton bracelets in Accessories > Bracelets
-- to the registered active LV brand. Scoped to the four known product rows.
UPDATE public.products AS p
SET
  brand = 'LV',
  brand_id = '2881cd2b-e962-4df3-b515-8758d63b5009'
WHERE p.id IN (
  '426645ab-1274-4262-b87c-a0920a9de798',
  'b13d7a53-a9d8-4bb6-a757-32cf9e67e6bf',
  '49014d97-5d8d-4b05-b407-aa9852d94be2',
  'b8e5d444-d695-4123-a159-5417957621e8'
)
  AND p.category_id = '7069df19-f10e-4da6-863c-696eb6fc68c6'
  AND EXISTS (
    SELECT 1
    FROM public.brands AS b
    WHERE b.id = '2881cd2b-e962-4df3-b515-8758d63b5009'
      AND b.name = 'LV'
      AND b.is_active = true
  );
