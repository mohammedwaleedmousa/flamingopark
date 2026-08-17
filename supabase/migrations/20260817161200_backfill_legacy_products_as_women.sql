-- The catalog predates the audience split. Existing unclassified products
-- remain in the legacy women's storefront, while all new products are saved
-- with an explicit audience from the admin product form.
update public.products
set audience = 'women'
where audience is null;
