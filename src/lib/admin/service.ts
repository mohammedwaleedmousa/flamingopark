import { supabase as supabaseClient } from "@/integrations/supabase/client";
// Cast to any to bypass strict generated types (currency_mode column not in types yet)
const supabase = supabaseClient as any;
import type { Database } from "@/integrations/supabase/types";
import type { QueryClient } from "@tanstack/react-query";

type OrdersRow = Database["public"]["Tables"]["orders"]["Row"];
type ProductsRow = Database["public"]["Tables"]["products"]["Row"];
type CustomersRow = Database["public"]["Tables"]["customers"]["Row"];
type ExpensesRow = Database["public"]["Tables"]["expenses"]["Row"];
type FinancialTxnRow = Database["public"]["Tables"]["financial_transactions"]["Row"];
type TransactionLineRow = Database["public"]["Tables"]["transaction_lines"]["Row"];
type ChartOfAccountRow = Database["public"]["Tables"]["chart_of_accounts"]["Row"];
type RefundsRow = Database["public"]["Tables"]["refunds"]["Row"];
type AnalyticsEventRow = Database["public"]["Tables"]["analytics_events"]["Row"];

type CurrencyMode = "SAR" | "YER_SOUTH" | "YER_NORTH";

const currencyModes: CurrencyMode[] = ["SAR", "YER_SOUTH", "YER_NORTH"];
const SAR_RATE_BY_MODE: Record<CurrencyMode, number> = {
  SAR: 1,
  YER_SOUTH: 1 / 410,
  YER_NORTH: 1 / 140,
};

function inferCurrencyModeFromOrder(row: any): CurrencyMode {
  const mode = row?.currency_mode;
  if (mode === "SAR" || mode === "YER_SOUTH" || mode === "YER_NORTH") return mode;
  if (row?.country === "SA") return "SAR";
  return "YER_SOUTH";
}

function createCurrencyAccumulator<T>(factory: () => T): Record<CurrencyMode, T> {
  return {
    SAR: factory(),
    YER_SOUTH: factory(),
    YER_NORTH: factory(),
  };
}

function toSarAmount(amount: number, row: any) {
  const mode = inferCurrencyModeFromOrder(row);
  const rate = SAR_RATE_BY_MODE[mode] ?? 1;
  return Number(amount || 0) * rate;
}

function isMissingColumnError(error: unknown) {
  const message = String((error as { message?: string })?.message || "");
  return /column .* does not exist/i.test(message) || /Could not find the '.*' column/i.test(message);
}

export type DateRange = { start: string; end: string };

export type AdminOrderQueryParams = {
  search?: string;
  status?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type AdminProductQueryParams = {
  search?: string;
  status?: "all" | "active" | "inactive";
  stock?: "all" | "in" | "out";
  country?: "all" | "GLOBAL";
  page?: number;
  pageSize?: number;
};

export type AdminCustomerQueryParams = {
  search?: string;
  country?: string;
  page?: number;
  pageSize?: number;
};

export type AdminOrderResult = {
  data: OrdersRow[];
  count: number;
};

export type AdminProductResult = {
  data: ProductsRow[];
  count: number;
};

export type AdminCustomerResult = {
  data: CustomersRow[];
  count: number;
};

export type AdminCustomerIntelligenceRow = {
  id: string;
  name: string;
  phone: string | null;
  region: string;
  orders: number;
  spent: number;
  aov: number;
  last: string | null;
  segment: "VIP" | "متوسط" | "عادي";
};

export type AdminFinanceOverview = {
  orders: { total: number; created_at: string; status: string }[];
  expenses: ExpensesRow[];
  refunds: { amount: number; created_at: string }[];
  transactions: FinancialTxnRow[];
};

export type AdminLedgerEntry = {
  id: string;
  date: string;
  type: "income" | "expense" | "transaction" | "import";
  category: string;
  amount: number;
  source?: string;
  description?: string;
};

export type AdminTransactionLineInput = {
  account_id: string;
  debit: number;
  credit: number;
  description?: string | null;
};

export type AdminCustomerDetailSearch = {
  phone?: string | null;
  name: string;
};

function normalizeRange(range: DateRange) {
  const start = new Date(range.start);
  const end = new Date(range.end);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function dateRangeFilters<T>(query: any, range: DateRange, column = "created_at") {
  const normalized = normalizeRange(range);
  return query.gte(column, normalized.start).lte(column, normalized.end);
}

function buildOrderListQuery(params: AdminOrderQueryParams) {
  let query = supabase.from("orders").select("*", { count: "exact" });
  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    query = query.or(`order_number.ilike.${term},customer_name.ilike.${term},customer_phone.ilike.${term}`);
  }
  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  if (params.country && params.country !== "all") query = query.eq("country", params.country);
  if (params.startDate) query = query.gte("created_at", new Date(params.startDate).toISOString());
  if (params.endDate) query = query.lte("created_at", new Date(params.endDate).toISOString());
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return query.order("created_at", { ascending: false }).range(from, to);
}

function buildProductListQuery(params: AdminProductQueryParams) {
  let query = supabase
    .from("products")
    .select("id,name,name_ar,slug,price,cost_price,discount,category,brand,in_stock,is_active,countries,images,sort_order,created_at", { count: "exact" });
  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    query = query.or(`name.ilike.${term},name_ar.ilike.${term},slug.ilike.${term}`);
  }
  if (params.status && params.status !== "all") query = query.eq("is_active", params.status === "active");
  if (params.stock && params.stock !== "all") query = query.eq("in_stock", params.stock === "in");
  if (params.country && params.country !== "all") query = query.contains("countries", [params.country]);
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return query.order("sort_order", { ascending: true }).order("created_at", { ascending: false }).range(from, to);
}

function buildCustomerListQuery(params: AdminCustomerQueryParams) {
  let query = supabase.from("customers").select("*", { count: "exact" });
  if (params.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    query = query.or(`name.ilike.${term},phone.ilike.${term}`);
  }
  if (params.country && params.country !== "all") query = query.eq("country", params.country);
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 30;
  const from = (page - 1) * pageSize;
  return query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);
}

export async function getOrders(params: AdminOrderQueryParams = {}): Promise<AdminOrderResult> {
  const { data, count, error } = await buildOrderListQuery(params);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
  if (error) throw error;
  return { orderId, newStatus };
}

export async function deleteOrder(orderId: string) {
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw error;
  return { orderId };
}

export async function bulkUpdateOrderStatus(orderIds: string[], newStatus: string) {
  const { error } = await supabase.from("orders").update({ status: newStatus }).in("id", orderIds);
  if (error) throw error;
  return { orderIds, newStatus };
}

export async function deleteOrders(orderIds: string[]) {
  const { error } = await supabase.from("orders").delete().in("id", orderIds);
  if (error) throw error;
  return { orderIds };
}

export async function getProducts(params: AdminProductQueryParams = {}): Promise<AdminProductResult> {
  const { data, count, error } = await buildProductListQuery(params);
  if (error) throw error;
  return { data: (data ?? []) as unknown as ProductsRow[], count: count ?? 0 };
}

export async function updateProductActive(productId: string, next: boolean) {
  const { error } = await supabase.from("products").update({ is_active: next }).eq("id", productId);
  if (error) throw error;
  return { productId, next };
}

export async function deleteProducts(productIds: string[]) {
  const { error } = await supabase.from("products").delete().in("id", productIds);
  if (error) throw error;
  return { productIds };
}

export async function getCustomers(params: AdminCustomerQueryParams = {}): Promise<AdminCustomerResult> {
  const { data, count, error } = await buildCustomerListQuery(params);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function deleteCustomers(customerIds: string[]) {
  const { error } = await supabase.from("customers").delete().in("id", customerIds);
  if (error) throw error;
  return { customerIds };
}

export async function getCustomerIntelligenceData(range: DateRange): Promise<AdminCustomerIntelligenceRow[]> {
  const normalized = normalizeRange(range);
  const { data, error } = await supabase
    .from("orders")
    .select("customer_name,customer_phone,customer_address,total,created_at,status")
    .neq("status", "cancelled")
    .gte("created_at", normalized.start)
    .lte("created_at", normalized.end)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw error;

  const byPhone = new Map<string, AdminCustomerIntelligenceRow>();
  const now = Date.now();

  (data ?? []).forEach((o) => {
    const key = (o.customer_phone?.trim() || o.customer_name?.trim() || `unknown-${Math.random()}`);
    const region = (o.customer_address || "").split(/[,،]/)[0]?.trim() || "غير محدد";
    const total = Number(o.total ?? 0);
    const existing = byPhone.get(key);

    if (existing) {
      existing.orders += 1;
      existing.spent += total;
      if (!existing.last || new Date(o.created_at) > new Date(existing.last)) existing.last = o.created_at;
    } else {
      byPhone.set(key, {
        id: key,
        name: o.customer_name || "عميل",
        phone: o.customer_phone || null,
        region,
        orders: 1,
        spent: total,
        aov: 0,
        last: o.created_at,
        segment: "عادي",
      });
    }
  });

  return Array.from(byPhone.values()).map((row) => {
    const aov = row.spent / Math.max(1, row.orders);
    const last = row.last;
    const daysSince = last ? (now - new Date(last).getTime()) / 86400000 : Infinity;
    let segment: AdminCustomerIntelligenceRow["segment"] = "عادي";
    if (row.spent >= 8000 || row.orders >= 6) segment = "VIP";
    else if (row.spent >= 2000 || row.orders >= 2) segment = "متوسط";

    return {
      ...row,
      aov,
      segment,
      region: row.region || "غير محدد",
    };
  }).sort((a, b) => b.spent - a.spent);
}

export async function getCustomerOrders(search: AdminCustomerDetailSearch, range: DateRange): Promise<OrdersRow[]> {
  const normalized = normalizeRange(range);
  let query = supabase
    .from("orders")
    .select("id,order_number,customer_name,customer_phone,customer_address,total,created_at,status,items")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(2000);

  query = query.gte("created_at", normalized.start).lte("created_at", normalized.end);

  if (search.phone) {
    query = query.eq("customer_phone", search.phone);
  } else {
    query = query.eq("customer_name", search.name);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as OrdersRow[];
}

export async function getCustomerPayments(orderIds: string[]) {
  if (!orderIds.length) return [];

  const refs = orderIds.map((id) => `reference.eq.${id}`).join(",");
  if (!refs) return [];

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("id,entry_date,description,reference,source_id,source_type")
    .or(refs)
    .limit(100);

  if (error) throw error;
  return data ?? [];
}

export async function getCustomerByPhone(phone: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function getRevenueSummary(startDate: string, endDate: string) {
  const normalized = normalizeRange({ start: startDate, end: endDate });
  let { data, error } = await supabase
    .from("orders")
    .select("total, status, created_at, country, currency_mode")
    .gte("created_at", normalized.start)
    .lte("created_at", normalized.end);

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("orders")
      .select("total, status, created_at, country")
      .gte("created_at", normalized.start)
      .lte("created_at", normalized.end);
    data = fallback.data;
    error = fallback.error;
  }
  if (error) throw error;

  const byCurrency = createCurrencyAccumulator(() => ({ revenue: 0, orders: 0 }));
  const byCurrencyNative = createCurrencyAccumulator(() => ({ revenue: 0, orders: 0 }));
  const validRows = (data ?? []).filter((r: any) => {
    const status = String(r?.status || "").toLowerCase();
    return status !== "cancelled" && status !== "canceled";
  });

  const revenue = validRows.reduce((sum, r) => {
    const amount = toSarAmount(Number(r.total ?? 0), r);
    const nativeAmount = Number(r.total ?? 0);
    const mode = inferCurrencyModeFromOrder(r);
    byCurrency[mode].revenue += amount;
    byCurrency[mode].orders += 1;
    byCurrencyNative[mode].revenue += nativeAmount;
    byCurrencyNative[mode].orders += 1;
    return sum + amount;
  }, 0);

  return { revenue, byCurrency, byCurrencyNative };
}

export async function getOrdersSummary(startDate: string, endDate: string) {
  const normalized = normalizeRange({ start: startDate, end: endDate });
  let { data, error } = await supabase
    .from("orders")
    .select("id, total, status, created_at, country, currency_mode")
    .gte("created_at", normalized.start)
    .lte("created_at", normalized.end);

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("orders")
      .select("id, total, status, created_at, country")
      .gte("created_at", normalized.start)
      .lte("created_at", normalized.end);
    data = fallback.data;
    error = fallback.error;
  }
  if (error) throw error;

  const rows = (data ?? []).filter((r: any) => {
    const status = String(r?.status || "").toLowerCase();
    return status !== "cancelled" && status !== "canceled";
  });
  const count = rows.length;
  const avg = count === 0 ? 0 : rows.reduce((s, o) => s + toSarAmount(Number(o.total ?? 0), o), 0) / count;
  const byCurrency = createCurrencyAccumulator(() => ({ orders: 0, revenue: 0, avg: 0 }));
  for (const row of rows) {
    const mode = inferCurrencyModeFromOrder(row);
    byCurrency[mode].orders += 1;
    byCurrency[mode].revenue += toSarAmount(Number(row.total ?? 0), row);
  }
  for (const mode of currencyModes) {
    const item = byCurrency[mode];
    item.avg = item.orders ? item.revenue / item.orders : 0;
  }

  return { count, avg, byCurrency };
}

export async function getCustomersCount(startDate: string, endDate: string) {
  const normalized = normalizeRange({ start: startDate, end: endDate });
  const { data, error } = await supabase
    .from("customers")
    .select("id, created_at")
    .gte("created_at", normalized.start)
    .lte("created_at", normalized.end);
  if (error) throw error;
  return { customers: (data ?? []).length };
}

export async function getRevenueTimeseries(startDate: string, endDate: string) {
  const normalized = normalizeRange({ start: startDate, end: endDate });
  const { data, error } = await supabase
    .from("orders")
    .select("total, status, created_at, country, currency_mode")
    .gte("created_at", normalized.start)
    .lte("created_at", normalized.end)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []).filter((r: any) => {
    const status = String(r?.status || "").toLowerCase();
    return status !== "cancelled" && status !== "canceled";
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = r.created_at?.slice(0, 10) ?? "";
    map.set(d, (map.get(d) ?? 0) + toSarAmount(Number(r.total ?? 0), r));
  }
  return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
}

export async function getProfitSummary(startDate: string, endDate: string) {
  const normalized = normalizeRange({ start: startDate, end: endDate });
  let { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, total, items, status, created_at, country, currency_mode")
    .gte("created_at", normalized.start)
    .lte("created_at", normalized.end);

  if (ordersError && isMissingColumnError(ordersError)) {
    const fallback = await supabase
      .from("orders")
      .select("id, total, items, status, created_at, country")
      .gte("created_at", normalized.start)
      .lte("created_at", normalized.end);
    orders = fallback.data;
    ordersError = fallback.error;
  }
  if (ordersError) throw ordersError;

  const rows = (orders ?? []).filter((r: any) => {
    const status = String(r?.status || "").toLowerCase();
    return status !== "cancelled" && status !== "canceled";
  });
  let revenue = 0;
  let totalCost = 0;
  const prodIds = new Set<string>();
  const byCurrency = createCurrencyAccumulator(() => ({ revenue: 0, totalCost: 0, profit: 0 }));

  for (const r of rows) {
    const amount = toSarAmount(Number(r.total ?? 0), r);
    revenue += amount;
    const mode = inferCurrencyModeFromOrder(r);
    byCurrency[mode].revenue += amount;
    try {
      const items = Array.isArray(r.items) ? r.items : JSON.parse(String(r.items || "[]"));
      for (const it of items) {
        if (it?.product_id) prodIds.add(it.product_id);
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  const productsMap: Record<string, number> = {};
  if (prodIds.size > 0) {
    const ids = Array.from(prodIds);
    const { data: products } = await supabase
      .from("products")
      .select("id, cost_price")
      .in("id", ids as string[]);
    for (const p of products ?? []) {
      productsMap[p.id] = Number(p.cost_price ?? 0);
    }
  }

  for (const r of rows) {
    try {
      const items = Array.isArray(r.items) ? r.items : JSON.parse(String(r.items || "[]"));
      const mode = inferCurrencyModeFromOrder(r);
      for (const it of items) {
        const qty = Number(it.quantity ?? it.qty ?? 1);
        const pid = it.product_id;
        const itemCost = qty * (productsMap[pid] ?? 0);
        totalCost += itemCost;
        byCurrency[mode].totalCost += itemCost;
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  for (const mode of currencyModes) {
    byCurrency[mode].profit = byCurrency[mode].revenue - byCurrency[mode].totalCost;
  }

  return { revenue, totalCost, profit: revenue - totalCost, byCurrency };
}

export async function getRecentOrders(startDate: string, endDate: string, limit = 6) {
  const normalized = normalizeRange({ start: startDate, end: endDate });
  let { data, error } = await supabase
    .from("orders")
    .select("id,order_number,customer_name,total,status,created_at,country,currency_mode")
    .gte("created_at", normalized.start)
    .lte("created_at", normalized.end)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error && isMissingColumnError(error)) {
    const fallback = await supabase
      .from("orders")
      .select("id,order_number,customer_name,total,status,created_at,country")
      .gte("created_at", normalized.start)
      .lte("created_at", normalized.end)
      .order("created_at", { ascending: false })
      .limit(limit);
    data = fallback.data;
    error = fallback.error;
  }
  if (error) throw error;
  return data ?? [];
}

export async function getLowStock(_threshold = 5, limit = 5) {
  const { data, error } = await supabase
    .from("products")
    .select("id,name_ar,price,in_stock")
    .eq("in_stock", false)
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((p: any) => ({ ...p, stock: 0 }));
}

export async function getFinanceOverview(range: DateRange): Promise<AdminFinanceOverview> {
  const normalized = normalizeRange(range);
  const [ordersRes, expensesRes, refundsRes, txRes] = await Promise.all([
    supabase
      .from("orders")
      .select("total,created_at,status")
      .gte("created_at", normalized.start)
      .lte("created_at", normalized.end)
      .neq("status", "cancelled"),
    supabase
      .from("expenses")
      .select("amount,expense_date,category_id,description,vendor")
      .gte("expense_date", normalized.start)
      .lte("expense_date", normalized.end),
    supabase
      .from("refunds")
      .select("amount,created_at")
      .gte("created_at", normalized.start)
      .lte("created_at", normalized.end),
    supabase
      .from("financial_transactions")
      .select("id,entry_date,description,reference,transaction_lines(debit,credit)")
      .order("entry_date", { ascending: false })
      .limit(8),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (expensesRes.error) throw expensesRes.error;
  if (refundsRes.error) throw refundsRes.error;
  if (txRes.error) throw txRes.error;

  return {
    orders: (ordersRes.data ?? []) as any,
    expenses: (expensesRes.data ?? []) as any,
    refunds: (refundsRes.data ?? []) as any,
    transactions: (txRes.data ?? []) as any,
  };
}

export async function getAnalyticsEvents(sinceIso: string, limit = 10000) {
  const pageSize = 1000;
  const events: AnalyticsEventRow[] = [];
  for (let page = 0; page * pageSize < limit; page += 1) {
    const start = page * pageSize;
    const end = start + pageSize - 1;
    const { data, error } = await supabase
      .from("analytics_events")
      .select(
        "event_type,session_id,user_id,product_id,value,utm_source,utm_campaign,referrer,device,created_at,metadata",
      )
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(start, end);
    if (error) throw error;
    if (!data?.length) break;
    events.push(...(data as any));
    if (data.length < pageSize) break;
  }
  return events;
}

export async function getChartOfAccounts() {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("id, code, name_ar, type")
    .eq("is_active", true)
    .order("code");
  if (error) throw error;
  return data ?? [];
}

export async function getLedgerTransactions(limit = 100) {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("id, entry_date, reference, description, created_at, transaction_lines(debit, credit, account_id, chart_of_accounts(name_ar, code))")
    .order("entry_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function createFinancialTransaction(
  entryDate: string,
  reference: string | null,
  description: string,
  lines: AdminTransactionLineInput[],
) {
  const { data: tx, error } = await supabase
    .from("financial_transactions")
    .insert({ entry_date: entryDate, reference: reference || null, description })
    .select()
    .single();
  if (error || !tx) throw error || new Error("Failed to create transaction");

  const { error: lerr } = await supabase.from("transaction_lines").insert(
    lines.map((line) => ({
      transaction_id: tx.id,
      account_id: line.account_id,
      debit: Number(line.debit) || 0,
      credit: Number(line.credit) || 0,
      description: line.description || null,
    })),
  );
  if (lerr) throw lerr;

  return tx;
}

export async function deleteFinancialTransaction(id: string) {
  const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
  if (error) throw error;
  return { id };
}

// Top Products - أعلى المنتجات مبيعاً
export async function getTopProducts(startDate: string, endDate: string, limit = 5) {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("items")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .neq("status", "cancelled");

  if (error) throw error;

  const productSales = new Map<string, { name: string; sales: number; count: number }>();

  for (const order of orders ?? []) {
    try {
      const items = Array.isArray(order.items) ? order.items : JSON.parse(String(order.items || "[]"));
      for (const item of items) {
        const key = item.product_id;
        const existing = productSales.get(key);
        if (existing) {
          existing.sales += Number(item.total || item.price * item.quantity);
          existing.count += item.quantity || 1;
        } else {
          productSales.set(key, {
            name: item.name_ar || item.name || "منتج",
            sales: Number(item.total || item.price * item.quantity),
            count: item.quantity || 1,
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return Array.from(productSales.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
}

// Orders by Status - توزيع الطلبات
export async function getOrdersByStatus(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("status")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (error) throw error;

  const statuses: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  for (const order of data ?? []) {
    const status = order.status as keyof typeof statuses;
    if (status in statuses) statuses[status]++;
  }

  return statuses;
}

// Conversion Rate - معدل التحويل
export async function getConversionMetrics(startDate: string, endDate: string) {
  const [{ data: events }, { data: orders }] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("session_id, event_type")
      .gte("created_at", startDate)
      .lte("created_at", endDate),
    supabase
      .from("orders")
      .select("id")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .neq("status", "cancelled"),
  ]);

  const sessions = new Set<string>();
  const checkoutSessions = new Set<string>();

  for (const event of events ?? []) {
    sessions.add(event.session_id);
    if (event.event_type === "checkout" || event.event_type === "purchase") {
      checkoutSessions.add(event.session_id);
    }
  }

  const conversionRate = sessions.size > 0 ? (checkoutSessions.size / sessions.size) * 100 : 0;
  const ordersCount = orders?.length ?? 0;

  return {
    totalSessions: sessions.size,
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    orderCount: ordersCount,
    avgOrderValue: ordersCount > 0 ? 0 : 0,
  };
}

// Returning Customers - العملاء المتكررين
export async function getReturningCustomers(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("customer_phone")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .neq("status", "cancelled");

  if (error) throw error;

  const phoneCount = new Map<string, number>();
  for (const order of data ?? []) {
    const phone = order.customer_phone;
    if (phone) phoneCount.set(phone, (phoneCount.get(phone) ?? 0) + 1);
  }

  let returning = 0;
  for (const count of phoneCount.values()) {
    if (count > 1) returning++;
  }

  return {
    totalCustomers: phoneCount.size,
    returningCustomers: returning,
    returnRate: phoneCount.size > 0 ? parseFloat(((returning / phoneCount.size) * 100).toFixed(2)) : 0,
  };
}

// Pending Alerts - التنبيهات المعلقة
export async function getPendingAlerts() {
  const [pendingOrders, lowStockProducts, returningOrders] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_number,customer_name,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10),
    supabase
      .from("products")
      .select("id,name_ar,in_stock")
      .eq("in_stock", false)
      .limit(10),
    supabase
      .from("orders")
      .select("id,order_number,customer_name,created_at,status")
      .or("status.eq.shipped,status.eq.processing")
      .order("created_at", { ascending: true })
      .limit(5),
  ]);

  return {
    pendingOrders: pendingOrders.data ?? [],
    lowStockProducts: lowStockProducts.data ?? [],
    returningOrders: returningOrders.data ?? [],
  };
}

// Category Performance - أداء الفئات
export async function getCategoryPerformance(startDate: string, endDate: string) {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("items")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .neq("status", "cancelled");

  if (ordersError) throw ordersError;

  const categoryStats = new Map<string, { sales: number; count: number }>();

  for (const order of orders ?? []) {
    try {
      const items = Array.isArray(order.items) ? order.items : JSON.parse(String(order.items || "[]"));
      for (const item of items) {
        const category = item.category || "أخرى";
        const existing = categoryStats.get(category);
        if (existing) {
          existing.sales += Number(item.total || item.price * item.quantity);
          existing.count += item.quantity || 1;
        } else {
          categoryStats.set(category, {
            sales: Number(item.total || item.price * item.quantity),
            count: item.quantity || 1,
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return Array.from(categoryStats.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.sales - a.sales);
}

// ========== 1️⃣ تحسينات التحليل المتقدمة ==========

// Customer Lifetime Value (CLV) - قيمة العميل مدى الحياة
export async function getCustomerLifetimeValue(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("customer_phone, total, created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .neq("status", "cancelled");

  if (error) throw error;

  const customerLTV = new Map<string, { orders: number; total: number; lastOrder: string }>();

  for (const order of data ?? []) {
    const phone = order.customer_phone || "unknown";
    const existing = customerLTV.get(phone);
    if (existing) {
      existing.orders += 1;
      existing.total += Number(order.total || 0);
      existing.lastOrder = order.created_at;
    } else {
      customerLTV.set(phone, {
        orders: 1,
        total: Number(order.total || 0),
        lastOrder: order.created_at,
      });
    }
  }

  return Array.from(customerLTV.entries()).map(([phone, data]) => ({
    phone,
    ltv: data.total,
    orderCount: data.orders,
    avgOrderValue: data.total / data.orders,
    lastOrder: data.lastOrder,
  }));
}

// Churn Risk Analysis - تحليل مخاطر فقدان العميل
export async function getChurnRiskAnalysis(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("customer_phone, customer_name, created_at, total")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .neq("status", "cancelled");

  if (error) throw error;

  const now = Date.now();
  const customerActivity = new Map<
    string,
    { name: string; lastOrder: Date; totalSpent: number; orderCount: number }
  >();

  for (const order of data ?? []) {
    const phone = order.customer_phone || "unknown";
    const existing = customerActivity.get(phone);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += Number(order.total || 0);
      if (new Date(order.created_at) > existing.lastOrder) {
        existing.lastOrder = new Date(order.created_at);
      }
    } else {
      customerActivity.set(phone, {
        name: order.customer_name || "عميل",
        lastOrder: new Date(order.created_at),
        totalSpent: Number(order.total || 0),
        orderCount: 1,
      });
    }
  }

  return Array.from(customerActivity.entries()).map(([phone, data]) => {
    const daysSinceLastOrder = (now - data.lastOrder.getTime()) / 86400000;
    let riskLevel: "high" | "medium" | "low" = "low";

    if (daysSinceLastOrder > 120) riskLevel = "high";
    else if (daysSinceLastOrder > 60) riskLevel = "medium";

    return {
      phone,
      name: data.name,
      riskLevel,
      daysSinceLastOrder,
      ltv: data.totalSpent,
      frequency: data.orderCount,
    };
  });
}

// RFM Analysis - Recency, Frequency, Monetary
export async function getRFMAnalysis(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("customer_phone, customer_name, created_at, total")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .neq("status", "cancelled");

  if (error) throw error;

  const now = new Date();
  const rfmMap = new Map<
    string,
    { name: string; recency: number; frequency: number; monetary: number }
  >();

  for (const order of data ?? []) {
    const phone = order.customer_phone || "unknown";
    const existing = rfmMap.get(phone);
    const orderDate = new Date(order.created_at);
    const daysAgo = Math.floor((now.getTime() - orderDate.getTime()) / 86400000);

    if (existing) {
      existing.frequency += 1;
      existing.monetary += Number(order.total || 0);
      existing.recency = Math.min(existing.recency, daysAgo);
    } else {
      rfmMap.set(phone, {
        name: order.customer_name || "عميل",
        recency: daysAgo,
        frequency: 1,
        monetary: Number(order.total || 0),
      });
    }
  }

  // Calculate RFM scores (1-5)
  const entries = Array.from(rfmMap.entries());
  const recencies = entries.map((e) => e[1].recency).sort((a, b) => a - b);
  const frequencies = entries.map((e) => e[1].frequency).sort((a, b) => b - a);
  const monetaries = entries.map((e) => e[1].monetary).sort((a, b) => b - a);

  const getPercentile = (val: number, arr: number[], ascending = true) => {
    const sorted = ascending ? arr : arr.reverse();
    const index = sorted.findIndex((v) => v >= val);
    return Math.ceil(((index + 1) / arr.length) * 5) || 1;
  };

  return entries.map(([phone, data]) => ({
    phone,
    name: data.name,
    recencyScore: 6 - getPercentile(data.recency, recencies),
    frequencyScore: getPercentile(data.frequency, frequencies, false),
    monetaryScore: getPercentile(data.monetary, monetaries, false),
    rfmScore: 0, // Will be calculated as avg
  })).map((item) => ({
    ...item,
    rfmScore: Math.round((item.recencyScore + item.frequencyScore + item.monetaryScore) / 3),
  }));
}

// Cohort Analysis - تجميع العملاء حسب فترة الانضمام
export async function getCohortAnalysis(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("customer_phone, customer_name, created_at, total")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (error) throw error;

  const cohortMap = new Map<string, Map<string, { orders: number; revenue: number }>>();
  
  for (const order of data ?? []) {
    const orderDate = new Date(order.created_at);
    const cohortMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}`;
    
    if (!cohortMap.has(cohortMonth)) {
      cohortMap.set(cohortMonth, new Map());
    }

    const cohortData = cohortMap.get(cohortMonth)!;
    const current = cohortData.get(cohortMonth) || { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += Number(order.total || 0);
    cohortData.set(cohortMonth, current);
  }

  return Array.from(cohortMap.entries()).map(([month, data]) => ({
    month,
    totalOrders: Array.from(data.values()).reduce((sum, d) => sum + d.orders, 0),
    totalRevenue: Array.from(data.values()).reduce((sum, d) => sum + d.revenue, 0),
  }));
}

// ========== 2️⃣ الرسوم البيانية المتقدمة ==========

// Customer Journey Map - مسار رحلة العميل
export async function getCustomerJourney(phone: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, created_at, status, total, items")
    .eq("customer_phone", phone)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((order, index) => ({
    step: index + 1,
    date: order.created_at,
    orderId: order.order_number || order.id,
    status: order.status,
    total: order.total,
    itemCount: Array.isArray(order.items) ? order.items.length : 0,
  }));
}

// Funnel Chart Data - مسار التحويل
export async function getFunnelData(startDate: string, endDate: string) {
  const { data: events, error } = await supabase
    .from("analytics_events")
    .select("session_id, event_type")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (error) throw error;

  const visitors = new Set<string>();
  const browsers = new Set<string>();
  const cartAdds = new Set<string>();
  const checkouts = new Set<string>();
  const purchases = new Set<string>();

  for (const event of events ?? []) {
    visitors.add(event.session_id);
    if (event.event_type === "browse") browsers.add(event.session_id);
    if (event.event_type === "add_to_cart") cartAdds.add(event.session_id);
    if (event.event_type === "checkout") checkouts.add(event.session_id);
    if (event.event_type === "purchase") purchases.add(event.session_id);
  }

  return [
    { name: "زوار", value: visitors.size, percentage: 100 },
    { name: "مصفحون", value: browsers.size, percentage: (browsers.size / visitors.size) * 100 },
    { name: "أضيفوا للسلة", value: cartAdds.size, percentage: (cartAdds.size / visitors.size) * 100 },
    { name: "الدفع", value: checkouts.size, percentage: (checkouts.size / visitors.size) * 100 },
    { name: "مشتريات", value: purchases.size, percentage: (purchases.size / visitors.size) * 100 },
  ];
}

// Retention Cohort - الاحتفاظ بالعملاء
export async function getRetentionCohort(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("customer_phone, created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const firstOrderMonth = new Map<string, string>();
  const monthlyOrders = new Map<string, Set<string>>();

  for (const order of data ?? []) {
    const phone = order.customer_phone || "unknown";
    const date = new Date(order.created_at);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!firstOrderMonth.has(phone)) {
      firstOrderMonth.set(phone, month);
    }

    if (!monthlyOrders.has(month)) {
      monthlyOrders.set(month, new Set());
    }
    monthlyOrders.get(month)!.add(phone);
  }

  const cohorts = new Map<string, Map<number, number>>();
  for (const [phone, firstMonth] of firstOrderMonth.entries()) {
    if (!cohorts.has(firstMonth)) {
      cohorts.set(firstMonth, new Map());
    }
    const cohort = cohorts.get(firstMonth)!;
    for (const [month, customers] of monthlyOrders.entries()) {
      if (customers.has(phone)) {
        const monthDiff = Math.floor(
          (new Date(month).getTime() - new Date(firstMonth).getTime()) / (30 * 24 * 60 * 60 * 1000)
        );
        cohort.set(monthDiff, (cohort.get(monthDiff) || 0) + 1);
      }
    }
  }

  return Array.from(cohorts.entries()).map(([month, data]) => ({
    cohortMonth: month,
    month0: data.get(0) || 0,
    month1: data.get(1) || 0,
    month2: data.get(2) || 0,
    month3: data.get(3) || 0,
    month6: data.get(6) || 0,
  }));
}

// ========== 3️⃣ التنبيهات والتوصيات ==========

// VIP Risk Alerts - تنبيهات عملاء VIP عالية المخاطر
export async function getVIPRiskAlerts(startDate: string, endDate: string) {
  const churnData = await getChurnRiskAnalysis(startDate, endDate);
  const now = Date.now();

  return churnData
    .filter((customer) => {
      // VIP: spent >= 8000 or >= 6 orders
      const isVIP = customer.ltv >= 8000 || customer.frequency >= 6;
      return isVIP && customer.riskLevel === "high";
    })
    .map((customer) => ({
      ...customer,
      recommendation: `عميل VIP عالي الخطورة: ${customer.name} - لم يشتري منذ ${Math.floor(customer.daysSinceLastOrder)} يوم`,
    }));
}

// Upsell Opportunities - فرص البيع الإضافي
export async function getUpsellOpportunities(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("customer_phone, customer_name, total, items")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .neq("status", "cancelled");

  if (error) throw error;

  const customerStats = new Map<
    string,
    { name: string; avgOrder: number; orders: number; potentialUpsell: boolean }
  >();

  for (const order of data ?? []) {
    const phone = order.customer_phone || "unknown";
    const existing = customerStats.get(phone);
    const total = Number(order.total || 0);

    if (existing) {
      existing.orders += 1;
      existing.avgOrder = (existing.avgOrder * (existing.orders - 1) + total) / existing.orders;
    } else {
      customerStats.set(phone, {
        name: order.customer_name || "عميل",
        avgOrder: total,
        orders: 1,
        potentialUpsell: false,
      });
    }
  }

  return Array.from(customerStats.entries())
    .map(([phone, data]) => ({
      phone,
      name: data.name,
      avgOrder: data.avgOrder,
      orders: data.orders,
      upsellOpportunity: data.orders >= 2 && data.avgOrder < 5000,
      suggestion: data.orders >= 2 ? "عرض منتجات متقدمة أو حزم" : "حث على الشراء الثاني",
    }))
    .filter((c) => c.upsellOpportunity);
}

// ========== 4️⃣ الإحصائيات المتقدمة ==========

// Year-over-Year Comparison
export async function getYearOverYearComparison(startDate: string, endDate: string) {
  const currentDate = new Date(endDate);
  const prevYear = new Date(currentDate);
  prevYear.setFullYear(prevYear.getFullYear() - 1);

  const prevStart = new Date(startDate);
  prevStart.setFullYear(prevStart.getFullYear() - 1);

  const [currentData, prevData] = await Promise.all([
    supabase
      .from("orders")
      .select("total, created_at, status")
      .gte("created_at", startDate)
      .lte("created_at", endDate),
    supabase
      .from("orders")
      .select("total, created_at, status")
      .gte("created_at", prevStart.toISOString())
      .lte("created_at", prevYear.toISOString()),
  ]);

  const current = {
    revenue: (currentData.data ?? [])
      .filter((o: any) => o.status !== "cancelled")
      .reduce((sum, o: any) => sum + Number(o.total || 0), 0),
    orders: (currentData.data ?? []).filter((o: any) => o.status !== "cancelled").length,
  };

  const prev = {
    revenue: (prevData.data ?? [])
      .filter((o: any) => o.status !== "cancelled")
      .reduce((sum, o: any) => sum + Number(o.total || 0), 0),
    orders: (prevData.data ?? []).filter((o: any) => o.status !== "cancelled").length,
  };

  return {
    current,
    previous: prev,
    revenueGrowth: prev.revenue > 0 ? ((current.revenue - prev.revenue) / prev.revenue) * 100 : 0,
    orderGrowth: prev.orders > 0 ? ((current.orders - prev.orders) / prev.orders) * 100 : 0,
  };
}

// Sales Forecast - التنبؤ بالمبيعات
export async function getSalesForecast(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("total, created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const dailyRevenue = new Map<string, number>();
  for (const order of data ?? []) {
    const date = order.created_at.slice(0, 10);
    dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + Number(order.total || 0));
  }

  const revenues = Array.from(dailyRevenue.values());
  const avgDaily = revenues.reduce((a, b) => a + b, 0) / Math.max(1, revenues.length);

  // Simple trend: forecast next 7 days
  const trend = revenues.length > 7
    ? (revenues.slice(-7).reduce((a, b) => a + b, 0) / 7 - avgDaily) / avgDaily
    : 0;

  return {
    avgDailyRevenue: avgDaily,
    trend,
    forecast7Days: avgDaily * 7 * (1 + trend),
    forecast30Days: avgDaily * 30 * (1 + trend),
  };
}

// Basket Analysis - تحليل السلة
export async function getBasketAnalysis(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("items")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .neq("status", "cancelled");

  if (error) throw error;

  const productPairs = new Map<string, number>();

  for (const order of data ?? []) {
    try {
      const items = Array.isArray(order.items) ? order.items : JSON.parse(String(order.items || "[]"));
      const productIds = items.map((item: any) => item.product_id || item.id).filter(Boolean);

      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const pair = [productIds[i], productIds[j]].sort().join("__");
          productPairs.set(pair, (productPairs.get(pair) || 0) + 1);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return Array.from(productPairs.entries())
    .map(([pair, count]) => ({
      products: pair.split("__"),
      frequency: count,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}

// ========== 5️⃣ التقارير المتقدمة ==========

// Comprehensive Report Data - بيانات التقرير الشامل
export async function getComprehensiveReport(startDate: string, endDate: string) {
  const [
    ltvData,
    churnData,
    rfmData,
    forecast,
    basketData,
    yoy,
    funnelData,
  ] = await Promise.all([
    getCustomerLifetimeValue(startDate, endDate),
    getChurnRiskAnalysis(startDate, endDate),
    getRFMAnalysis(startDate, endDate),
    getSalesForecast(startDate, endDate),
    getBasketAnalysis(startDate, endDate),
    getYearOverYearComparison(startDate, endDate),
    getFunnelData(startDate, endDate),
  ]);

  return {
    generated: new Date().toISOString(),
    dateRange: { start: startDate, end: endDate },
    ltv: {
      avgLTV: ltvData.reduce((sum, c) => sum + c.ltv, 0) / Math.max(1, ltvData.length),
      topCustomers: ltvData.sort((a, b) => b.ltv - a.ltv).slice(0, 10),
    },
    churn: {
      highRiskCount: churnData.filter((c) => c.riskLevel === "high").length,
      atRiskCustomers: churnData.filter((c) => c.riskLevel !== "low"),
    },
    rfm: {
      avgScore: rfmData.reduce((sum, c) => sum + c.rfmScore, 0) / Math.max(1, rfmData.length),
      topTier: rfmData.filter((c) => c.rfmScore >= 4),
    },
    forecast,
    basket: basketData,
    yoy,
    funnel: funnelData,
  };
}

export function invalidateAdminQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const [root] = query.queryKey;
      if (root === "admin") return true;
      if (typeof root === "string") {
        return [
          "revenueSummary",
          "ordersSummary",
          "customersCount",
          "revenueTimeseries",
          "profitSummary",
          "recentOrders",
          "lowStock",
          "topProducts",
          "ordersByStatus",
          "conversionMetrics",
          "returningCustomers",
          "pendingAlerts",
          "categoryPerformance",
          "customerLTV",
          "churnRisk",
          "rfmAnalysis",
          "cohortAnalysis",
          "customerJourney",
          "funnelData",
          "retentionCohort",
          "vipRiskAlerts",
          "upsellOpportunities",
          "yoyComparison",
          "salesForecast",
          "basketAnalysis",
          "comprehensiveReport",
        ].includes(root);
      }
      return false;
    },
  });
}
