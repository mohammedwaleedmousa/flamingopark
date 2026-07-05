import * as service from "@/lib/admin/service";

export const getRevenueSummary = service.getRevenueSummary;
export const getOrdersSummary = service.getOrdersSummary;
export const getCustomersCount = service.getCustomersCount;
export const getRevenueTimeseries = service.getRevenueTimeseries;
export const getProfitSummary = service.getProfitSummary;
export const getRecentOrders = service.getRecentOrders;
export const getLowStock = service.getLowStock;

export default {
  getRevenueSummary,
  getOrdersSummary,
  getCustomersCount,
  getRevenueTimeseries,
};
