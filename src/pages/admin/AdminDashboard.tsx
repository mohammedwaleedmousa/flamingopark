import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarClock, ShieldCheck, Sparkles } from "lucide-react";
import AdminDashboardBase from "@/pages/admin/AdminDashboardBase";
import AdminCommandCenterPage from "@/pages/admin/AdminCommandCenterPage";
import AdminOrderPreparationPage from "@/pages/admin/AdminOrderPreparationPage";
import AdminPublishingWorkspacePage from "@/pages/admin/AdminPublishingWorkspacePage";
import AdminTeamPermissionsPage from "@/pages/admin/AdminTeamPermissionsPage";

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
        <WorkspaceNav />
        <AdminCommandCenterPage />
      </div>
    );
  }

  if (workspace === "preparation") {
    return (
      <div className="space-y-3">
        <WorkspaceNav />
        <AdminOrderPreparationPage />
      </div>
    );
  }

  if (workspace === "publishing") {
    return (
      <div className="space-y-3">
        <WorkspaceNav />
        <AdminPublishingWorkspacePage />
      </div>
    );
  }

  if (workspace === "team") {
    return (
      <div className="space-y-3">
        <WorkspaceNav />
        <AdminTeamPermissionsPage />
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

const WorkspaceNav = () => (
  <div className="print:hidden flex flex-wrap items-center gap-[6px]">
    <Link to="/admin" className="inline-flex h-[31px] items-center gap-[6px] rounded-[8px] border border-[#E3E7EC] bg-white px-[9px] text-[7.5px] font-semibold text-[#747C86] transition hover:bg-[#F8FAFC] hover:text-[#4D5560]"><ArrowRight className="h-[11px] w-[11px]" />لوحة التحكم</Link>
    <Link to="/admin?workspace=command-center" className="inline-flex h-[31px] items-center gap-[6px] rounded-[8px] border border-[#DDD8F4] bg-white px-[9px] text-[7.5px] font-semibold text-[#675CBA] transition hover:bg-[#F7F5FF]"><Sparkles className="h-[11px] w-[11px]" />مركز الأدمن</Link>
    <Link to="/admin?workspace=publishing" className="inline-flex h-[31px] items-center gap-[6px] rounded-[8px] border border-[#E3E7EC] bg-white px-[9px] text-[7.5px] font-semibold text-[#747C86] transition hover:bg-[#F8FAFC] hover:text-[#557CA9]"><CalendarClock className="h-[11px] w-[11px]" />النشر والجدولة</Link>
    <Link to="/admin?workspace=team" className="inline-flex h-[31px] items-center gap-[6px] rounded-[8px] border border-[#E3E7EC] bg-white px-[9px] text-[7.5px] font-semibold text-[#747C86] transition hover:bg-[#F8FAFC] hover:text-[#568468]"><ShieldCheck className="h-[11px] w-[11px]" />الفريق والصلاحيات</Link>
  </div>
);

export default AdminDashboard;