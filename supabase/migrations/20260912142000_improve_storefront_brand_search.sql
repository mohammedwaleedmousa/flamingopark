create or replace function public.search_storefront_product_ids(
  p_query text,
  p_offset integer default 0,
  p_limit integer default 24
)
returns table(product_id uuid, total_count bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with normalized as (
    select
      lower(btrim(coalesce(p_query,''))) as q,
      lower(replace(replace(replace(replace(replace(btrim(coalesce(p_query,'')),'أ','ا'),'إ','ا'),'آ','ا'),'ؤ','و'),'ئ','ي')) as q_ar
  ), terms as (
    select q,q_ar,
      case
        when q_ar in ('اديداس','ادي داس') or q='adidas' then 'adidas'
        when q_ar in ('نايك','نايكي') or q='nike' then 'nike'
        when q_ar='بوما' or q='puma' then 'puma'
        when q_ar in ('جوتشي','غوتشي','قوتشي') or q='gucci' then 'gucci'
        when q_ar='شانيل' or q='chanel' then 'chanel'
        when q_ar='ديور' or q='dior' then 'dior'
        when q_ar in ('لويس فيتون','لوي فيتون','ال في','لف') or q in ('louis vuitton','lv') then 'louis vuitton'
        when q_ar='كوتش' or q='coach' then 'coach'
        when q_ar in ('اسيكس','اسكس') or q='asics' then 'asics'
        when q_ar='كونفرس' or q='converse' then 'converse'
        when q_ar in ('بلغاري','بولغاري') or q in ('bvlgari','bulgari') then 'bvlgari'
        when q_ar in ('كارتيه','كارتير') or q='cartier' then 'cartier'
        else null
      end as brand_alias
    from normalized
  ), matched as (
    select p.id,count(*) over() as total_count,
      case
        when t.brand_alias is not null and lower(coalesce(p.brand,''))=t.brand_alias then 0
        when lower(coalesce(p.brand,''))=t.q then 1
        when lower(coalesce(p.name_ar,''))=t.q or lower(coalesce(p.name,''))=t.q then 2
        when lower(coalesce(p.name_ar,'')) like '%'||t.q||'%' or lower(coalesce(p.name,'')) like '%'||t.q||'%' then 3
        when lower(coalesce(p.brand,'')) like '%'||t.q||'%' then 4
        else 5
      end as relevance,
      p.created_at
    from public.products p cross join terms t
    where p.is_active=true and nullif(t.q,'') is not null and (
      (t.brand_alias is not null and lower(coalesce(p.brand,''))=t.brand_alias)
      or lower(coalesce(p.brand,'')) like '%'||t.q||'%'
      or lower(coalesce(p.name_ar,'')) like '%'||t.q||'%'
      or lower(coalesce(p.name,'')) like '%'||t.q||'%'
      or lower(coalesce(p.description_ar,'')) like '%'||t.q||'%'
      or lower(coalesce(p.description,'')) like '%'||t.q||'%'
      or lower(replace(replace(replace(replace(replace(coalesce(p.name_ar,''),'أ','ا'),'إ','ا'),'آ','ا'),'ؤ','و'),'ئ','ي')) like '%'||t.q_ar||'%'
    )
  )
  select id,total_count from matched
  order by relevance asc,created_at desc
  offset greatest(0,coalesce(p_offset,0))
  limit least(100,greatest(1,coalesce(p_limit,24)));
$$;

revoke all on function public.search_storefront_product_ids(text,integer,integer) from public;
grant execute on function public.search_storefront_product_ids(text,integer,integer) to anon, authenticated;

create index if not exists idx_products_active_brand_lower on public.products (lower(brand)) where is_active=true;
analyze public.products;
