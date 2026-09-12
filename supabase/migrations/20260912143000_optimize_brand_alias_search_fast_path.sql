create or replace function public.search_storefront_product_ids(
  p_query text,
  p_offset integer default 0,
  p_limit integer default 24
)
returns table(product_id uuid, total_count bigint)
language plpgsql
stable
set search_path = 'public','pg_temp'
as $$
declare
  v_q text := lower(btrim(coalesce(p_query,'')));
  v_q_ar text;
  v_brand_alias text;
  v_offset integer := greatest(0, coalesce(p_offset,0));
  v_limit integer := least(100, greatest(1, coalesce(p_limit,24)));
begin
  if v_q = '' then return; end if;

  v_q_ar := lower(replace(replace(replace(replace(replace(v_q,'أ','ا'),'إ','ا'),'آ','ا'),'ؤ','و'),'ئ','ي'));
  v_brand_alias := case
    when v_q_ar in ('اديداس','ادي داس') or v_q = 'adidas' then 'adidas'
    when v_q_ar in ('نايك','نايكي') or v_q = 'nike' then 'nike'
    when v_q_ar = 'بوما' or v_q = 'puma' then 'puma'
    when v_q_ar in ('جوتشي','غوتشي','قوتشي') or v_q = 'gucci' then 'gucci'
    when v_q_ar = 'شانيل' or v_q = 'chanel' then 'chanel'
    when v_q_ar = 'ديور' or v_q = 'dior' then 'dior'
    when v_q_ar in ('لويس فيتون','لوي فيتون','ال في','لف') or v_q in ('louis vuitton','lv') then 'louis vuitton'
    when v_q_ar = 'كوتش' or v_q = 'coach' then 'coach'
    when v_q_ar in ('اسيكس','اسكس') or v_q = 'asics' then 'asics'
    when v_q_ar = 'كونفرس' or v_q = 'converse' then 'converse'
    when v_q_ar in ('بلغاري','بولغاري') or v_q in ('bvlgari','bulgari') then 'bvlgari'
    when v_q_ar in ('كارتيه','كارتير') or v_q = 'cartier' then 'cartier'
    else null
  end;

  if v_brand_alias is not null then
    return query
      select p.id, count(*) over()
      from public.products p
      where p.is_active = true and lower(coalesce(p.brand,'')) = v_brand_alias
      order by p.created_at desc
      offset v_offset limit v_limit;
    return;
  end if;

  return query
    with matched as (
      select p.id, count(*) over() as total_count,
        case
          when lower(coalesce(p.brand,'')) = v_q then 1
          when lower(coalesce(p.name_ar,'')) = v_q or lower(coalesce(p.name,'')) = v_q then 2
          when lower(coalesce(p.name_ar,'')) like '%' || v_q || '%' or lower(coalesce(p.name,'')) like '%' || v_q || '%' then 3
          when lower(coalesce(p.brand,'')) like '%' || v_q || '%' then 4
          else 5
        end as relevance,
        p.created_at
      from public.products p
      where p.is_active = true and (
        lower(coalesce(p.brand,'')) like '%' || v_q || '%'
        or lower(coalesce(p.name_ar,'')) like '%' || v_q || '%'
        or lower(coalesce(p.name,'')) like '%' || v_q || '%'
        or lower(coalesce(p.description_ar,'')) like '%' || v_q || '%'
        or lower(coalesce(p.description,'')) like '%' || v_q || '%'
        or lower(replace(replace(replace(replace(replace(coalesce(p.name_ar,''),'أ','ا'),'إ','ا'),'آ','ا'),'ؤ','و'),'ئ','ي')) like '%' || v_q_ar || '%'
      )
    )
    select m.id, m.total_count from matched m
    order by m.relevance asc, m.created_at desc
    offset v_offset limit v_limit;
end;
$$;

grant execute on function public.search_storefront_product_ids(text,integer,integer) to anon, authenticated;
