alter table public.orders
  drop constraint if exists orders_invoice_review_status_check;

alter table public.orders
  add constraint orders_invoice_review_status_check
  check (
    invoice_review_status = any (
      array[
        'unreviewed'::text,
        'pending'::text,
        'accepted'::text,
        'rejected'::text,
        'returned'::text
      ]
    )
  );
