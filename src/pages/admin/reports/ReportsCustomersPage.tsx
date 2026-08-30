import ReportsCustomersModernPage from "./ReportsCustomersModernPage";

const customerKpiStyles = `
  .customer-report-kpi-colors > div > section:first-of-type {
    border-color: #DDE2E8 !important;
    background: linear-gradient(90deg, #FBFCFA 0%, #F7F6FC 55%, #F2F5FB 100%) !important;
    box-shadow: 0 8px 22px rgba(65, 74, 91, 0.05);
  }

  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section {
    position: relative;
    overflow: hidden;
    border-width: 1px !important;
    box-shadow: 0 8px 20px rgba(60, 68, 82, 0.06);
    transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
  }

  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 26px rgba(60, 68, 82, 0.09);
  }

  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section::before {
    content: "";
    position: absolute;
    inset-inline: 0;
    top: 0;
    height: 4px;
  }

  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(1) { background: linear-gradient(180deg, #F3F0FF 0%, #FFFFFF 72%) !important; border-color: #D8D2F1 !important; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(2) { background: linear-gradient(180deg, #EFF5FF 0%, #FFFFFF 72%) !important; border-color: #D5E2F4 !important; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(3) { background: linear-gradient(180deg, #ECF8F5 0%, #FFFFFF 72%) !important; border-color: #D2EAE3 !important; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(4) { background: linear-gradient(180deg, #EFF7EE 0%, #FFFFFF 72%) !important; border-color: #D7E6D3 !important; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(5) { background: linear-gradient(180deg, #F6EFFF 0%, #FFFFFF 72%) !important; border-color: #E0D4F0 !important; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(6) { background: linear-gradient(180deg, #FFF6E8 0%, #FFFFFF 72%) !important; border-color: #EEDDBD !important; }

  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(1)::before { background: #675CBA; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(2)::before { background: #5680CF; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(3)::before { background: #4C9687; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(4)::before { background: #629067; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(5)::before { background: #8F63C1; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-6"] > section:nth-child(6)::before { background: #C38838; }

  .customer-report-kpi-colors section[class~="xl:grid-cols-5"] > button {
    position: relative;
    overflow: hidden;
    box-shadow: 0 6px 16px rgba(62, 71, 84, 0.05);
    transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
  }

  .customer-report-kpi-colors section[class~="xl:grid-cols-5"] > button:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 22px rgba(62, 71, 84, 0.08);
  }

  .customer-report-kpi-colors section[class~="xl:grid-cols-5"] > button:nth-child(1) { background: #F2F8F1 !important; border-color: #D5E6D2 !important; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-5"] > button:nth-child(2) { background: #F0F5FD !important; border-color: #D4E0F2 !important; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-5"] > button:nth-child(3) { background: #F3F0FC !important; border-color: #D9D2F1 !important; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-5"] > button:nth-child(4) { background: #FFF7EB !important; border-color: #ECDABA !important; }
  .customer-report-kpi-colors section[class~="xl:grid-cols-5"] > button:nth-child(5) { background: #FFF4F1 !important; border-color: #EED4CE !important; }

  .customer-report-kpi-colors section[class*="overflow-hidden"][class*="bg-white"] > div:first-child {
    background: linear-gradient(90deg, #FBFCFA 0%, #F5F3FB 100%) !important;
    border-bottom-color: #E4E1EC !important;
  }

  .customer-report-kpi-colors section[class*="overflow-hidden"][class*="bg-white"] > div:first-child > div:first-child {
    box-shadow: inset 0 0 0 1px rgba(103, 92, 186, 0.08);
  }

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
