import { supabase } from "@/integrations/supabase/client";
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

type DateRange = { start: string; end: string };

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
  country?: "all" | "SA" | "YE";
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
  if (params.country && params.country !== "all") query = query.eq("countries", params.country);
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
  return { data: data ?? [], count: count ?? 0 };
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
    .select("id,order_number,customer_name,customer_phone,customer_address,total,created_at,status,line_items")
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
  return data ?? [];
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
  const { data, error } = await supabase
    .from("orders")
    .select("total, created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate);
  if (error) throw error;

  const revenue = (data ?? []).reduce((sum, r) => sum + Number(r.total ?? 0), 0);
  return { revenue };
}

export async function getOrdersSummary(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, total, created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate);
  if (error) throw error;

  const rows = data ?? [];
  const count = rows.length;
  const avg = count === 0 ? 0 : rows.reduce((s, o) => s + Number(o.total ?? 0), 0) / count;
  return { count, avg };
}

export async function getCustomersCount(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("customers")
    .select("id, created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate);
  if (error) throw error;
  return { customers: (data ?? []).length };
}

export async function getRevenueTimeseries(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("total, created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = r.created_at?.slice(0, 10) ?? "";
    map.set(d, (map.get(d) ?? 0) + Number(r.total ?? 0));
  }
  return Array.from(map.entries()).map(([date, total]) => ({ date, total }));
}

export async function getProfitSummary(startDate: string, endDate: string) {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, total, items, created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate);
  if (ordersError) throw ordersError;

  const rows = orders ?? [];
  let revenue = 0;
  let totalCost = 0;
  const prodIds = new Set<string>();

  for (const r of rows) {
    revenue += Number(r.total ?? 0);
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
      for (const it of items) {
        const qty = Number(it.quantity ?? it.qty ?? 1);
        const pid = it.product_id;
        totalCost += qty * (productsMap[pid] ?? 0);
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  return { revenue, totalCost, profit: revenue - totalCost };
}

export async function getRecentOrders(startDate: string, endDate: string, limit = 6) {
  const { data, error } = await supabase
    .from("orders")
    .select("id,order_number,customer_name,total,status,created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getLowStock(threshold = 5, limit = 5) {
  const { data, error } = await supabase
    .from("products")
    .select("id,name_ar,stock,price")
    .lte("stock", threshold)
    .order("stock", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
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
    orders: ordersRes.data ?? [],
    expenses: expensesRes.data ?? [],
    refunds: refundsRes.data ?? [],
    transactions: txRes.data ?? [],
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
    events.push(...data);
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
        ].includes(root);
      }
      return false;
    },
  });
}
