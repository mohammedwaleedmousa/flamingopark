# Admin Pages Standardization Guide

## Overview

This document outlines the standard pattern for all admin pages in the Flamingo Park admin panel. The goal is to ensure consistency, maintainability, and a professional user experience across all 30 admin pages.

## Updated Pages (Modern Pattern) ✅

1. **AdminProductsPage** - Products catalog management
2. **AdminOrdersPage** - Orders management
3. **AdminCustomersPage** - Customer management
4. **AdminDashboard** - Analytics dashboard (reference)
5. **AdminFinanceDashboard** - Finance management (reference)
6. **AdminCustomerIntelligence** - Customer analytics (reference)

## Standard Admin Page Template

### 1. Imports

Every admin page should import:

```typescript
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
// ... other imports
```

### 2. Page Header

Replace the old header with `AdminPageHeader`:

```typescript
<AdminPageHeader
  category="إدارة الكتالوج"  // Category label
  title="المنتجات"            // Main title
  description="إدارة 150 منتج"  // Description with count
  actions={[
    {
      label: "إضافة منتج",
      icon: Plus,
      href: "/admin/products/new",
      variant: "primary",
    },
    {
      label: "التحليلات",
      icon: BarChart3,
      href: "/admin/analytics",
      variant: "outline",
    },
  ]}
/>
```

### 3. Layout Structure

```typescript
<div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
  {/* AdminPageHeader */}

  {/* KPI Cards (optional) */}
  {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    ... KPI cards ...
  </div> */}

  {/* Filters Section */}
  <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-3">
    {/* Search, filters, bulk actions */}
  </div>

  {/* Main Content */}
  <div className="bg-card border border-border rounded-2xl p-3 md:p-4">
    {/* Table, list, or custom content */}
  </div>

  {/* Pagination */}
  <AdminPagination ... />
</div>
```

### 4. Button Variants

Use consistent button styling:

- **Primary**: Pink gradient for main CTA
- **Secondary**: Green/emerald gradient for secondary actions
- **Outline**: Pink bordered for tertiary actions

### 5. Color Scheme

- Primary: Pink (#DA3E73)
- Secondary: Emerald (#10B981)
- Gold/Accent: #FFB800
- Backgrounds: Use `bg-card`, `bg-background`
- Text: Use `text-foreground`, `text-muted-foreground`

## Pages to Update (Priority Order)

### High Priority (Core CRUD)

1. ✅ **AdminProductsPage** - Done
2. ✅ **AdminOrdersPage** - Done
3. ✅ **AdminCustomersPage** - Done
4. **AdminCouponsPage** - Marketing
5. **AdminOffersPage** - Marketing
6. **AdminBannersPage** - Content
7. **AdminBrandsPage** - Catalog

### Medium Priority (Finance & Analytics)

8. **AdminRevenuePage** - Analytics
9. **AdminProfitReportPage** - Finance
10. **AdminLedgerPage** - Accounting
11. **AdminAnalyticsPage** - Tracking
12. **AdminRefundsPage** - Finance

### Lower Priority (Settings & Support)

13. **AdminSettingsPage** - Settings
14. **AdminPaymentMethodsPage** - Config
15. **AdminCategoriesPage** - Catalog
16. **AdminSectionsPage** - Homepage
17. **AdminCODRegionsPage** - Regions
18. **AdminReviewsPage** - Content
19. **AdminContentPage** - Static content
20. **AdminDeliveryPage** - Shipping
21. **AdminInventoryAdjustmentsPage** - Stock
22. **AdminAuditLogPage** - Logging
23. - 7 more pages

## Implementation Checklist for Each Page

- [ ] Add `AdminPageHeader` import
- [ ] Replace old header with `AdminPageHeader` component
- [ ] Add `category`, `title`, `description` props
- [ ] Add relevant action buttons
- [ ] Ensure layout uses `space-y-6` and `dir="rtl"`
- [ ] Verify button colors match theme
- [ ] Test responsive behavior
- [ ] Build and verify no errors

## Code Examples

### Before (Old Pattern)

```typescript
<div className="space-y-5">
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div>
      <h1 className="font-heading text-2xl md:text-3xl text-foreground">المنتجات</h1>
      <p className="text-muted-foreground text-sm mt-1">
        <span className="font-medium text-foreground">{total.toLocaleString("ar-EG")}</span> منتج إجمالاً
      </p>
    </div>
    <Button asChild className="btn-gold gap-2 w-full sm:w-auto">
      <Link to={newProductHref}>
        <Plus className="w-4 h-4" />
        إضافة منتج
      </Link>
    </Button>
  </div>
  {/* Filters... */}
</div>
```

### After (New Pattern)

```typescript
<div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
  <AdminPageHeader
    category="الكتالوج"
    title="المنتجات"
    description={`إدارة ${total.toLocaleString("ar-EG")} منتج`}
    actions={[
      {
        label: "إضافة منتج",
        icon: Plus,
        href: newProductHref,
        variant: "primary",
      },
      {
        label: "التحليلات",
        icon: BarChart3,
        href: "/admin/analytics",
        variant: "outline",
      },
    ]}
  />
  {/* Filters... */}
</div>
```

## Component: AdminPageHeader

Location: `src/components/admin/AdminPageHeader.tsx`

Props:

- `title` (string, required): Page title
- `description` (string, optional): Page description with metrics
- `category` (string, optional): Category/section label
- `actions` (array, optional): Action buttons array with:
  - `label`: Button text
  - `icon`: Lucide icon component
  - `href` or `onClick`: Navigation or callback
  - `variant`: 'primary' | 'secondary' | 'outline'

Features:

- Responsive design (mobile-first)
- RTL support
- Icon + text buttons
- Gradient color variants
- Hover scale animations

## Styling Standards

### Spacing

- Section spacing: `space-y-6`
- Card padding: `p-3 md:p-4`
- Internal gaps: `gap-3` or `gap-4`

### Borders & Corners

- Card borders: `border border-border`
- Border radius: `rounded-2xl`
- Hover effects: `hover:shadow-lg transition-shadow`

### Responsive Classes

- Desktop-first approach
- `md:flex`, `md:flex-row`, `md:w-40` for tablets+
- Mobile stacking by default
- `lg:grid-cols-4` for large screens

## Testing Checklist

- [ ] Page compiles without errors
- [ ] Header displays correctly with title and actions
- [ ] Action buttons navigate/trigger correctly
- [ ] Responsive on mobile (< 640px)
- [ ] Responsive on tablet (640px - 1024px)
- [ ] Responsive on desktop (> 1024px)
- [ ] RTL direction works correctly
- [ ] Colors match theme
- [ ] No console warnings or errors

## Next Steps

1. Apply this pattern to High Priority pages
2. Review and test each page after update
3. Update Medium Priority pages
4. Final polish on Lower Priority pages
5. Comprehensive QA across all pages
