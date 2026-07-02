import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDateRange } from "@/lib/analytics/dateRange";
import * as service from "@/lib/admin/service";

const orderQueryKey = (params: service.AdminOrderQueryParams) => [
  "admin",
  "orders",
  params.search ?? "",
  params.status ?? "all",
  params.country ?? "all",
  params.startDate ?? "",
  params.endDate ?? "",
  params.page ?? 1,
  params.pageSize ?? 25,
] as const;
const productQueryKey = (params: service.AdminProductQueryParams) => ["admin", "products", params.search ?? "", params.status ?? "all", params.stock ?? "all", params.country ?? "all", params.page ?? 1, params.pageSize ?? 25] as const;
const customerQueryKey = (params: service.AdminCustomerQueryParams) => ["admin", "customers", params.search ?? "", params.country ?? "all", params.page ?? 1, params.pageSize ?? 30] as const;

export function useAdminOrders(params: service.AdminOrderQueryParams = {}) {
  return useQuery({
    queryKey: orderQueryKey(params),
    queryFn: () => service.getOrders(params),
    placeholderData: (prev: any) => prev,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: string }) => service.updateOrderStatus(orderId, newStatus),
    onSuccess: () => service.invalidateAdminQueries(queryClient),
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => service.deleteOrder(orderId),
    onSuccess: () => service.invalidateAdminQueries(queryClient),
  });
}

export function useBulkUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderIds, newStatus }: { orderIds: string[]; newStatus: string }) => service.bulkUpdateOrderStatus(orderIds, newStatus),
    onSuccess: () => service.invalidateAdminQueries(queryClient),
  });
}

export function useDeleteOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderIds: string[]) => service.deleteOrders(orderIds),
    onSuccess: () => service.invalidateAdminQueries(queryClient),
  });
}

export function useAdminProducts(params: service.AdminProductQueryParams = {}) {
  return useQuery({
    queryKey: productQueryKey(params),
    queryFn: () => service.getProducts(params),
    placeholderData: (prev: any) => prev,
  });
}

export function useUpdateProductActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, next }: { productId: string; next: boolean }) => service.updateProductActive(productId, next),
    onSuccess: () => service.invalidateAdminQueries(queryClient),
  });
}

export function useDeleteProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productIds: string[]) => service.deleteProducts(productIds),
    onSuccess: () => service.invalidateAdminQueries(queryClient),
  });
}

export function useAdminCustomers(params: service.AdminCustomerQueryParams = {}) {
  return useQuery({
    queryKey: customerQueryKey(params),
    queryFn: () => service.getCustomers(params),
    placeholderData: (prev: any) => prev,
  });
}

export function useDeleteCustomers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerIds: string[]) => service.deleteCustomers(customerIds),
    onSuccess: () => service.invalidateAdminQueries(queryClient),
  });
}

export function useCustomerIntelligence(range: service.DateRange) {
  return useQuery({
    queryKey: ["admin", "customer-intelligence", range.start, range.end],
    queryFn: () => service.getCustomerIntelligenceData(range),
    placeholderData: (prev: any) => prev,
  });
}

export function useCustomerOrders(search: service.AdminCustomerDetailSearch, range: service.DateRange) {
  return useQuery({
    queryKey: ["admin", "customer-orders", search.phone ?? search.name, range.start, range.end],
    queryFn: () => service.getCustomerOrders(search, range),
    placeholderData: (prev: any) => prev,
  });
}

export function useCustomerPayments(orderIds: string[]) {
  return useQuery({
    queryKey: ["admin", "customer-payments", ...orderIds],
    queryFn: () => service.getCustomerPayments(orderIds),
    enabled: orderIds.length > 0,
  });
}

export function useCustomerByPhone(phone?: string) {
  return useQuery({
    queryKey: ["admin", "customer-by-phone", phone],
    queryFn: () => (phone ? service.getCustomerByPhone(phone) : Promise.resolve(null)),
    enabled: !!phone,
  });
}

export function useFinanceOverview(range: service.DateRange) {
  return useQuery({
    queryKey: ["admin", "finance-overview", range.start, range.end],
    queryFn: () => service.getFinanceOverview(range),
    placeholderData: (prev: any) => prev,
  });
}

export function useLedgerTransactions() {
  return useQuery({
    queryKey: ["admin", "ledger-transactions"],
    queryFn: () => service.getLedgerTransactions(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useChartOfAccounts() {
  return useQuery({
    queryKey: ["admin", "chart-of-accounts"],
    queryFn: () => service.getChartOfAccounts(),
  });
}

export function useCreateFinancialTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      entryDate: string;
      reference: string | null;
      description: string;
      lines: service.AdminTransactionLineInput[];
    }) => service.createFinancialTransaction(payload.entryDate, payload.reference, payload.description, payload.lines),
    onSuccess: () => service.invalidateAdminQueries(queryClient),
  });
}

export function useDeleteFinancialTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => service.deleteFinancialTransaction(id),
    onSuccess: () => service.invalidateAdminQueries(queryClient),
  });
}

export function useRevenueSummary() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["admin", "revenueSummary", range.start, range.end],
    queryFn: () => service.getRevenueSummary(range.start, range.end),
  });
}

export function useOrdersSummary() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["admin", "ordersSummary", range.start, range.end],
    queryFn: () => service.getOrdersSummary(range.start, range.end),
  });
}

export function useCustomersCount() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["admin", "customersCount", range.start, range.end],
    queryFn: () => service.getCustomersCount(range.start, range.end),
  });
}

export function useRevenueTimeseries() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["admin", "revenueTimeseries", range.start, range.end],
    queryFn: () => service.getRevenueTimeseries(range.start, range.end),
  });
}

export function useProfitSummary() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["admin", "profitSummary", range.start, range.end],
    queryFn: () => service.getProfitSummary(range.start, range.end),
  });
}

export function useRecentOrders() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["admin", "recentOrders", range.start, range.end],
    queryFn: () => service.getRecentOrders(range.start, range.end),
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: ["admin", "lowStock"],
    queryFn: () => service.getLowStock(),
  });
}
