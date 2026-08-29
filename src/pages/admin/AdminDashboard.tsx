import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import AdminDashboardBase from "@/pages/admin/AdminDashboardBase";
import AdminCommandCenterPage from "@/pages/admin/AdminCommandCenterPage";
import AdminOrderPreparationPage from "@/pages/admin/AdminOrderPreparationPage";

const AdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workspace = searchParams.get("workspace");

  const interceptPreparationLinks = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor?.getAttribute("href") !== "/admin/order-preparation") return;
    event.preventDefault();
    navigate("/admin?workspace=preparation");
  };

  if (workspace === "command-center") {
    return (
      <div className="space-y-3" onClickCapture={interceptPreparationLinks}>
        <WorkspaceBack />
        <AdminCommandCenterPage />
      </div>
    );
  }

  if (workspace === "preparation") {
    return (
      <div className="space-y-3">
        <WorkspaceBack />
        <AdminOrderPreparationPage />
      </div>
    );
  }

  return (
    <>
      <AdminDashboardBase />
      <Link
        to="/admin?workspace=command-center"
        className="fixed bottom-[18px] left-[18px] z-[60] inline-flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DDD8F4] bg-white px-[11px] text-[8px] font-semibold text-[#675CBA] shadow-[0_8px_28px_rgba(35,42,55,0.10)] transition hover:bg-[#F7F5FF]"
      >
        <Sparkles className="h-[13px] w-[13px]" />
        مركز الأدمن
      </Link>
    </>
  );
};

const WorkspaceBack = () => (
  <Link
    to="/admin"
    className="print:hidden inline-flex h-[31px] items-center gap-[6px] rounded-[8px] border border-[#E3E7EC] bg-white px-[9px] text-[7.5px] font-semibold text-[#747C86] transition hover:bg-[#F8FAFC] hover:text-[#4D5560]"
  >
    <ArrowRight className="h-[11px] w-[11px]" />
    لوحة التحكم
  </Link>
);

export default AdminDashboard;
