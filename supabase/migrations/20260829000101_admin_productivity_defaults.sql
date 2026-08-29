-- Safe default records for the admin productivity foundation.
-- Additive and idempotent: existing template keys are preserved.

insert into public.whatsapp_templates (name, body, template_key, category)
values
  ('تأكيد الطلب', 'مرحبًا {name}، تم استلام طلبك رقم {order_number} وسيتم تأكيده معك قريبًا.', 'order_confirmation', 'orders'),
  ('الطلب قيد التجهيز', 'مرحبًا {name}، طلبك رقم {order_number} قيد التجهيز الآن.', 'order_processing', 'orders'),
  ('تم شحن الطلب', 'مرحبًا {name}، تم شحن طلبك رقم {order_number}. سنشاركك أي تحديثات إضافية فور توفرها.', 'order_shipped', 'orders'),
  ('تأكيد المقاس', 'مرحبًا {name}، نحتاج تأكيد المقاس للطلب رقم {order_number} قبل إكمال التجهيز.', 'size_confirmation', 'orders')
on conflict (template_key) where template_key is not null do nothing;
