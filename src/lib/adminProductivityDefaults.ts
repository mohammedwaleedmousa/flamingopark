export const DEFAULT_WHATSAPP_TEMPLATES = [
  {
    template_key: "order_confirmation",
    name: "تأكيد الطلب",
    category: "orders",
    body: "مرحبًا {name}، تم استلام طلبك رقم {order_number} وسيتم تأكيده معك قريبًا.",
  },
  {
    template_key: "order_processing",
    name: "الطلب قيد التجهيز",
    category: "orders",
    body: "مرحبًا {name}، طلبك رقم {order_number} قيد التجهيز الآن.",
  },
  {
    template_key: "order_shipped",
    name: "تم شحن الطلب",
    category: "orders",
    body: "مرحبًا {name}، تم شحن طلبك رقم {order_number}. سنشاركك أي تحديثات إضافية فور توفرها.",
  },
  {
    template_key: "size_confirmation",
    name: "تأكيد المقاس",
    category: "orders",
    body: "مرحبًا {name}، نحتاج تأكيد المقاس للطلب رقم {order_number} قبل إكمال التجهيز.",
  },
] as const;

export const ADMIN_PERMISSION_CATALOG = [
  "products.view",
  "products.edit",
  "products.delete",
  "products.bulk_update",
  "inventory.view",
  "inventory.adjust",
  "orders.view",
  "orders.manage",
  "orders.delete",
  "customers.view",
  "customers.manage",
  "marketing.view",
  "marketing.manage",
  "finance.view",
  "finance.manage",
  "reports.view",
  "settings.manage",
  "admin.approvals.review",
  "admin.permissions.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_CATALOG)[number];
