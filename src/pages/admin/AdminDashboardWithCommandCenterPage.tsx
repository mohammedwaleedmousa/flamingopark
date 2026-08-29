import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import AdminDashboard from "@/pages/admin/AdminDashboard";

const AdminDashboardWithCommandCenterPage = () => (
  <>
    <AdminDashboard />
    <Link
      to="/admin/command-center"
      className="fixed bottom-[18px] left-[18px] z-[60] inline-flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DDD8F4] bg-white px-[11px] text-[8px] font-semibold text-[#675CBA] shadow-[0_8px_28px_rgba(35,42,55,0.10)] transition hover:bg-[#F7F5FF]"
    >
      <Sparkles className="h-[13px] w-[13px]" />
      مركز الأدمن
    </Link>
  </>
);

export default AdminDashboardWithCommandCenterPage;
