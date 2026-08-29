# Admin Productivity Rollout

## Non-destructive rule

Every productivity change must be additive or backwards compatible. Existing admin routes, storefront behavior, product/order fields, and working workflows remain available unless a later migration explicitly proves a safe replacement.

## Phase 1 — Foundation (this branch)

- [x] Admin preferences and favorites storage
- [x] WhatsApp templates storage and safe defaults
- [x] Customer internal notes storage
- [x] Order internal notes storage
- [x] Admin revision history storage
- [x] Approval requests storage
- [x] Permission override storage
- [x] Admin-only RLS
- [x] Foreign-key integrity for customer/order notes
- [x] Supporting foreign-key indexes
- [x] Frontend service helpers
- [x] RLS smoke-test definitions

## Phase 2 — Product productivity

- [ ] Duplicate product
- [ ] Inline quick edit for safe fields
- [ ] XLSX import preview/validation
- [ ] XLSX bulk update preview/validation
- [ ] Catalog health center
- [ ] Classification suggestions
- [ ] Revision recording for product changes
- [ ] Safe restore/undo for supported fields

## Phase 3 — Orders and customers

- [ ] Internal notes UI
- [ ] WhatsApp template picker
- [ ] Recommended next-order action
- [ ] Returning-customer context
- [ ] Picking/packing sheet
- [ ] Daily preparation list

## Phase 4 — Storefront management

- [ ] Draft state where supported
- [ ] Preview before publish
- [ ] Banner scheduling
- [ ] Offer/campaign scheduling enhancements

## Phase 5 — Admin command center

- [ ] Global data search (products/orders/customers/brands)
- [ ] Smart operational alerts
- [ ] Favorites UI
- [ ] Daily task center
- [ ] Expanded quick actions

## Phase 6 — Team controls

- [ ] Permission management UI
- [ ] Route/action permission enforcement
- [ ] Approval workflow for high-impact changes
- [ ] Audit and regression verification
