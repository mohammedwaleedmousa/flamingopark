import React from "react";
import { DateRangeProvider, DateRangePicker } from "../../lib/analytics/dateRange";
import { useRevenueSummary, useOrdersSummary, useCustomersCount, useRevenueTimeseries } from "../../lib/analytics/hooks";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const KPI: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="p-4 bg-white rounded shadow">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

export default function AdminDashboardOverview() {
  return (
    <DateRangeProvider>
      <DashboardContent />
    </DateRangeProvider>
  );
}

function DashboardContent() {
  const revenue = useRevenueSummary();
  const orders = useOrdersSummary();
  const customers = useCustomersCount();
  const timeseries = useRevenueTimeseries();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <DateRangePicker />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPI label="Revenue" value={revenue.data ? `${revenue.data.revenue.toFixed(2)} (Multi)` : "—"} />
        <KPI label="Orders (avg)" value={orders.data ? `${orders.data.count} / ${orders.data.avg.toFixed(2)}` : "—"} />
        <KPI label="New Customers" value={customers.data ? customers.data.customers : "—"} />
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-medium mb-2">Revenue — Time Series</h2>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeseries.data ?? []}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
