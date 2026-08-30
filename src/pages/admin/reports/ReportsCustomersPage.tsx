import ReportsCustomersModernPage from "./ReportsCustomersModernPage";

const customerKpiStyles = `
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section {
    position: relative;
    overflow: hidden;
    transition: border-color 150ms ease;
  }

  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:hover {
    border-color: #DCE1E8;
  }

  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section::before {
    content: "";
    position: absolute;
    inset-inline: 0;
    top: 0;
    height: 3px;
  }

  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(1)::before { background: #675CBA; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(2)::before { background: #5680CF; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(3)::before { background: #4C9687; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(4)::before { background: #629067; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(5)::before { background: #8F63C1; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(6)::before { background: #C38838; }
`;

export default function ReportsCustomersPage() {
  return (
    <div className="customer-report-kpi-colors">
      <style>{customerKpiStyles}</style>
      <ReportsCustomersModernPage />
    </div>
  );
}
