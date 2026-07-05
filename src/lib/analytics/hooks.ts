import { useQuery } from "@tanstack/react-query";
import * as api from "./index";
import { useDateRange } from "./dateRange";

export function useRevenueSummary() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["revenueSummary", range], queryFn: () => api.getRevenueSummary(range.start, range.end) });
}

export function useOrdersSummary() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["ordersSummary", range], queryFn: () => api.getOrdersSummary(range.start, range.end) });
}

export function useCustomersCount() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["customersCount", range], queryFn: () => api.getCustomersCount(range.start, range.end) });
}

export function useRevenueTimeseries() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["revenueTimeseries", range], queryFn: () => api.getRevenueTimeseries(range.start, range.end) });
}

export function useProfitSummary() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["profitSummary", range], queryFn: () => api.getProfitSummary(range.start, range.end) });
}

export function useRecentOrders() {
  const { range } = useDateRange();
  return useQuery({ queryKey: ["recentOrders", range], queryFn: () => api.getRecentOrders(range.start, range.end) });
}

export function useLowStock() {
  return useQuery({ queryKey: ["lowStock"], queryFn: () => api.getLowStock() });
}
