-- Add referential integrity after the productivity tables exist.
-- Uses NOT VALID first to avoid blocking deployment if legacy references are ever introduced during rollout.

alter table public.customer_internal_notes
  add constraint customer_internal_notes_customer_fk
  foreign key (customer_id) references public.customers(id) on delete cascade
  not valid;

alter table public.customer_internal_notes
  validate constraint customer_internal_notes_customer_fk;

alter table public.order_internal_notes
  add constraint order_internal_notes_order_fk
  foreign key (order_id) references public.orders(id) on delete cascade
  not valid;

alter table public.order_internal_notes
  validate constraint order_internal_notes_order_fk;
