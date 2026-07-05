import * as service from "@/lib/admin/service";

export const getRevenueSummary = service.getRevenueSummary;
export const getOrdersSummary = service.getOrdersSummary;
export const getCustomersCount = service.getCustomersCount;
export const getRevenueTimeseries = service.getRevenueTimeseries;
export const getProfitSummary = service.getProfitSummary;
export const getRecentOrders = service.getRecentOrders;
export const getLowStock = service.getLowStock;
export const getTopProducts = service.getTopProducts;
export const getOrdersByStatus = service.getOrdersByStatus;
export const getConversionMetrics = service.getConversionMetrics;
export const getReturningCustomers = service.getReturningCustomers;
export const getPendingAlerts = service.getPendingAlerts;
export const getCategoryPerformance = service.getCategoryPerformance;

// Advanced Analytics
export const getCustomerLifetimeValue = service.getCustomerLifetimeValue;
export const getChurnRiskAnalysis = service.getChurnRiskAnalysis;
export const getRFMAnalysis = service.getRFMAnalysis;
export const getCohortAnalysis = service.getCohortAnalysis;
export const getCustomerJourney = service.getCustomerJourney;
export const getFunnelData = service.getFunnelData;
export const getRetentionCohort = service.getRetentionCohort;
export const getVIPRiskAlerts = service.getVIPRiskAlerts;
export const getUpsellOpportunities = service.getUpsellOpportunities;
export const getYearOverYearComparison = service.getYearOverYearComparison;
export const getSalesForecast = service.getSalesForecast;
export const getBasketAnalysis = service.getBasketAnalysis;
export const getComprehensiveReport = service.getComprehensiveReport;

export default {
  getRevenueSummary,
  getOrdersSummary,
  getCustomersCount,
  getRevenueTimeseries,
  getTopProducts,
  getOrdersByStatus,
  getConversionMetrics,
  getReturningCustomers,
  getCustomerLifetimeValue,
  getChurnRiskAnalysis,
  getRFMAnalysis,
  getCohortAnalysis,
};
