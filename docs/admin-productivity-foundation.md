# Admin Productivity Foundation

This foundation is additive. It does not remove or rename any existing admin page, database table, route, product field, order field, or storefront behavior.

## Added capabilities

- Per-admin preferences and favorite routes.
- WhatsApp message templates.
- Internal notes for customers and orders.
- Change revisions for future undo/history workflows.
- Approval requests for sensitive admin actions.
- Per-user permission overrides while keeping existing admins fully compatible.

## Backwards compatibility

Existing users with the `admin` role keep their current access. The permission helper in the frontend treats a missing explicit permission row as allowed for existing admins. No current admin workflow is blocked by the new tables.

## Next integrations

1. Connect internal notes to customer and order detail screens.
2. Connect favorite routes to the admin shell.
3. Add WhatsApp template picker to order actions.
4. Record revisions around quick product price/stock edits.
5. Add approval workflow to bulk destructive or high-impact operations.
6. Extend global admin search to products, orders, customers, and brands.
