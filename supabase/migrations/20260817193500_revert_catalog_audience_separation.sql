-- Restore the catalog/category model to the state used before the temporary audience split.

-- Reattach the child categories that were previously under the kids/babes category.
update public.categories child
set parent_id = parent.id
from public.categories parent
where parent.slug = 'kids'
  and child.slug in ('clothes','pants');

-- Restore the original slug used by the customer categories page.
update public.categories
set slug = 'babes',
    category_kind = 'category'
where slug = 'kids';

-- Restore men/women as regular categories.
update public.categories
set category_kind = 'category'
where slug in ('men','women','babes');

-- Remove the temporary audience-only category created by the split.
delete from public.categories
where slug = 'unisex'
  and not exists (select 1 from public.products p where p.category_id = public.categories.id);

-- Remove schema added only for the abandoned audience split.
drop index if exists public.idx_products_audience_active_category;
alter table public.products drop constraint if exists products_audience_check;
alter table public.categories drop constraint if exists categories_category_kind_check;
alter table public.products drop column if exists audience;
alter table public.categories drop column if exists category_kind;
