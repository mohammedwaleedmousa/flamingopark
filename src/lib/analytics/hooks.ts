import { useQuery } from "@tanstack/react-query";
import * as api from "./index";
import { useDateRange } from "./dateRange";

export function useRevenueSummary() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["revenueSummary", range],
    queryFn: () => api.getRevenueSummary(range.start, range.end),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export function useOrdersSummary() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["ordersSummary", range],
    queryFn: () => api.getOrdersSummary(range.start, range.end),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export function useCustomersCount() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["customersCount", range],
    queryFn: () => api.getCustomersCount(range.start, range.end),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}

export function useRevenueTimeseries() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["revenueTimeseries", range],
    queryFn: () => api.getRevenueTimeseries(range.start, range.end),
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });
}

export function useProfitSummary() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["profitSummary", range],
    queryFn: () => api.getProfitSummary(range.start, range.end),
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });
}

export function useRecentOrders() {
  const { range } = useDateRange();
  return useQuery({
    queryKey: ["recentOrders", range],
    queryFn: () => api.getRecentOrders(range.start, range.end),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });
}

export function useLowStock() {
  return useQuery({ queryKey: ["lowStock"], queryFn: () => api.getLowStock() });
}

export function useTopProducts() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["topProducts", range], queryFn: () => api.getTopProducts(range.start, range.end) });
}

export function useOrdersByStatus() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["ordersByStatus", range], queryFn: () => api.getOrdersByStatus(range.start, range.end) });
}

export function useConversionMetrics() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["conversionMetrics", range], queryFn: () => api.getConversionMetrics(range.start, range.end) });
}

export function useReturningCustomers() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["returningCustomers", range], queryFn: () => api.getReturningCustomers(range.start, range.end) });
}

export function usePendingAlerts() {
  return useQuery({ queryKey: ["pendingAlerts"], queryFn: () => api.getPendingAlerts(), refetchInterval: 60000 });
}

export function useCategoryPerformance() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["categoryPerformance", range], queryFn: () => api.getCategoryPerformance(range.start, range.end) });
}

// ========== Advanced Analytics Hooks ==========

export function useCustomerLTV() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["customerLTV", range], queryFn: () => api.getCustomerLifetimeValue(range.start, range.end) });
}

export function useChurnRisk() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["churnRisk", range], queryFn: () => api.getChurnRiskAnalysis(range.start, range.end) });
}

export function useRFMAnalysis() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["rfmAnalysis", range], queryFn: () => api.getRFMAnalysis(range.start, range.end) });
}

export function useCohortAnalysis() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["cohortAnalysis", range], queryFn: () => api.getCohortAnalysis(range.start, range.end) });
}

export function useCustomerJourney(phone: string) {
  const { range } = useDateRange();
  return useQuery({ 
    queryKey: ["customerJourney", phone, range], 
    queryFn: () => api.getCustomerJourney(phone, range.start, range.end),
    enabled: !!phone,
  });
}

export function useFunnelData() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["funnelData", range], queryFn: () => api.getFunnelData(range.start, range.end) });
}

export function useRetentionCohort() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["retentionCohort", range], queryFn: () => api.getRetentionCohort(range.start, range.end) });
}

export function useVIPRiskAlerts() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["vipRiskAlerts", range], queryFn: () => api.getVIPRiskAlerts(range.start, range.end) });
}

export function useUpsellOpportunities() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["upsellOpportunities", range], queryFn: () => api.getUpsellOpportunities(range.start, range.end) });
}

export function useYearOverYearComparison() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["yoyComparison", range], queryFn: () => api.getYearOverYearComparison(range.start, range.end) });
}

export function useSalesForecast() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["salesForecast", range], queryFn: () => api.getSalesForecast(range.start, range.end) });
}

export function useBasketAnalysis() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["basketAnalysis", range], queryFn: () => api.getBasketAnalysis(range.start, range.end) });
}

export function useComprehensiveReport() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["comprehensiveReport", range], queryFn: () => api.getComprehensiveReport(range.start, range.end) });
}
