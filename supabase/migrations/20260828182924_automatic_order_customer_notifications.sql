create or replace function public.notify_customer_order_status()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_title text;
  v_message text;
  v_type text;
begin
  if tg_op = 'INSERT' then
    v_title := 'تم استلام طلبك';
    v_message := concat('تم استلام الطلب ', new.order_number, ' وسيتم مراجعته قريباً.');
    v_type := 'order_created';
  elsif new.status is not distinct from old.status then
    return new;
  else
    v_type := concat('order_status_', coalesce(new.status, 'updated'));
    case new.status
      when 'pending' then
        v_title := 'طلبك قيد المراجعة';
        v_message := concat('الطلب ', new.order_number, ' قيد المراجعة حالياً.');
      when 'confirmed' then
        v_title := 'تم تأكيد طلبك';
        v_message := concat('تم تأكيد الطلب ', new.order_number, ' ويجري تجهيزه.');
      when 'processing' then
        v_title := 'جاري تجهيز طلبك';
        v_message := concat('الطلب ', new.order_number, ' قيد التجهيز الآن.');
      when 'shipped' then
        v_title := 'تم شحن طلبك';
        v_message := concat('الطلب ', new.order_number, ' خرج للتوصيل.');
      when 'delivered' then
        v_title := 'تم تسليم طلبك';
        v_message := concat('تم تسليم الطلب ', new.order_number, '. شكراً لتسوقك من Flamingo Park.');
      when 'cancelled' then
        v_title := 'تم إلغاء الطلب';
        v_message := concat('تم إلغاء الطلب ', new.order_number, '.');
      else
        v_title := 'تحديث على طلبك';
        v_message := concat('تم تحديث حالة الطلب ', new.order_number, '.');
    end case;
  end if;

  if new.owner_user_id is null and new.customer_id is null then
    return new;
  end if;

  insert into public.customer_notifications(
    user_id,
    customer_id,
    customer_phone,
    country,
    title,
    message,
    body,
    type,
    broadcast,
    related_order_id,
    link
  ) values (
    new.owner_user_id,
    new.customer_id,
    new.customer_phone,
    new.country,
    v_title,
    v_message,
    v_message,
    v_type,
    false,
    new.id,
    '/my-orders'
  );

  return new;
end;
$function$;

drop trigger if exists notify_customer_order_insert_trg on public.orders;
create trigger notify_customer_order_insert_trg
after insert on public.orders
for each row execute function public.notify_customer_order_status();

drop trigger if exists notify_customer_order_status_trg on public.orders;
create trigger notify_customer_order_status_trg
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.notify_customer_order_status();

revoke all on function public.notify_customer_order_status() from public, anon, authenticated;
