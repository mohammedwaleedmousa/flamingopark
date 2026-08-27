-- Keep every new invoice in the manual review queue until an admin decides its destination.
alter table public.orders
  alter column invoice_review_status set default 'pending';

-- Normalize legacy untouched invoices into the same queue.
update public.orders
set invoice_review_status = 'pending',
    invoice_reviewed_at = null,
    invoice_reviewed_by = null
where invoice_review_status = 'unreviewed';
