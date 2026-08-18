-- Fix product cost capture for new products and allow products to be saved without a sale price.

alter table public.products
  alter column price drop not null;

create or replace function public.normalize_product_price_draft()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.price is not null and new.price < 0 then
    raise exception 'سعر البيع لا يمكن أن يكون سالباً';
  end if;

  -- Missing/zero price is treated as a draft so it never appears publicly by mistake.
  if new.price is null or new.price = 0 then
    new.price := null;
    new.is_active := false;
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_product_price_draft_trigger on public.products;
create trigger normalize_product_price_draft_trigger
before insert or update of price, is_active on public.products
for each row execute function public.normalize_product_price_draft();

create or replace function public.capture_product_cost_price()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if new.cost_price is null then
    return new;
  end if;

  if auth.uid() is not null and not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'not_authorized' using errcode='42501';
  end if;

  -- AFTER trigger: the parent products row now exists, so the FK is valid.
  insert into public.product_costs(product_id,cost_price,updated_at)
  values(new.id,greatest(0,new.cost_price),now())
  on conflict(product_id) do update
    set cost_price=excluded.cost_price,
        updated_at=now();

  -- Keep sensitive cost data out of the public products row.
  -- The recursive UPDATE fires the trigger again with NULL and exits immediately.
  update public.products
  set cost_price=null
  where id=new.id and cost_price is not null;

  return new;
end;
$$;

drop trigger if exists capture_product_cost_price_trigger on public.products;
create trigger capture_product_cost_price_trigger
after insert or update of cost_price on public.products
for each row execute function public.capture_product_cost_price();
