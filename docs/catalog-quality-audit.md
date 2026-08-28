# Catalog Quality Audit

Admin-only read-only audit implemented on the existing `/admin/catalog-workflow` route.

Checks:
- missing or unknown brand
- missing or unknown category
- missing images
- invalid or non-positive price
- out-of-stock warning
- incomplete product names

The audit uses live Supabase data and links affected rows to `/admin/products/:id` for manual correction. No customer storefront UI or customer routes are changed.
