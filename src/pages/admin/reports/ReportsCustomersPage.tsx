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

  .customer-report-kpi-colors button[role="combobox"] {
    border-color: #DDE2D8 !important;
    background: #F8FAF7 !important;
    color: #59634D !important;
    transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
  }

  .customer-report-kpi-colors button[role="combobox"]:hover {
    border-color: #C8D0C0 !important;
    background: #F2F4F0 !important;
  }

  .customer-report-kpi-colors button[role="combobox"][data-state="open"] {
    border-color: #889676 !important;
    background: #FFFFFF !important;
    box-shadow: 0 0 0 3px rgba(100, 112, 87, 0.10) !important;
  }

  .customer-report-kpi-colors button[role="combobox"] svg {
    color: #647057 !important;
    opacity: 0.9 !important;
  }

  body:has(.customer-report-kpi-colors) [role="listbox"] {
    border: 1px solid #DDE2D8 !important;
    border-radius: 10px !important;
    background: #FFFFFF !important;
    padding: 4px !important;
    box-shadow: 0 12px 28px rgba(49, 58, 44, 0.12) !important;
  }

  body:has(.customer-report-kpi-colors) [role="option"] {
    min-height: 34px;
    border-radius: 8px !important;
    color: #59634D !important;
    font-size: 10.5px !important;
    font-weight: 600 !important;
    transition: background-color 120ms ease, color 120ms ease;
  }

  body:has(.customer-report-kpi-colors) [role="option"][data-highlighted] {
    background: #F2F4F0 !important;
    color: #3F4938 !important;
  }

  body:has(.customer-report-kpi-colors) [role="option"][data-state="checked"] {
    background: #EDF1E9 !important;
    color: #59634D !important;
  }

  body:has(.customer-report-kpi-colors) [role="option"] svg {
    color: #647057 !important;
  }

  .customer-report-kpi-colors div:has(> input[type="date"]) {
    border-color: #DDE2D8 !important;
    background: #F8FAF7 !important;
    transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
  }

  .customer-report-kpi-colors div:has(> input[type="date"]):focus-within {
    border-color: #889676 !important;
    background: #FFFFFF !important;
    box-shadow: 0 0 0 3px rgba(100, 112, 87, 0.10) !important;
  }

  .customer-report-kpi-colors input[type="date"] {
    color: #59634D !important;
    accent-color: #647057;
  }

  .customer-report-kpi-colors div:has(> input[type="date"]) ~ button {
    border-color: #DDE2D8 !important;
    color: #647057 !important;
    background: #FFFFFF !important;
  }

  .customer-report-kpi-colors div:has(> input[type="date"]) ~ button:hover {
    border-color: #C8D0C0 !important;
    color: #4F5B45 !important;
    background: #EDF1E9 !important;
  }
`;

export default function ReportsCustomersPage() {
  return (
    <div className="customer-report-kpi-colors">
      <style>{customerKpiStyles}</style>
      <ReportsCustomersModernPage />
    </div>
  );
}
