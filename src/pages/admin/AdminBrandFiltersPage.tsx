import { useNavigate } from "react-router-dom";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { ArrowRight } from "lucide-react";

const AdminBrandFiltersPage = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      <AdminPageHeader
        category="الماركات"
        title="فلاتر الماركة"
        description="قيد التطوير"
        actions={[{ label: "رجوع", icon: ArrowRight, onClick: () => navigate("/admin/brand-pages"), variant: "secondary" }]}
      />
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        سيتم تفعيل إدارة الفلاتر المخصصة لكل ماركة قريباً.
      </div>
    </div>
  );
};

export default AdminBrandFiltersPage;