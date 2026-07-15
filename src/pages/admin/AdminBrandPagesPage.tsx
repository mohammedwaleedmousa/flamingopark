import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, Layers, Loader2 } from "lucide-react";

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  hero_image: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

const AdminBrandPagesPage = () => {
  const navigate = useNavigate();

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin-brand-pages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brands")
        .select("id,name,slug,logo_url,hero_image,is_active,sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as BrandRow[];
    },
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="الماركات"
        title="صفحات الماركات"
        description={`${brands.length} صفحة ماركة`}
        actions={[
          {
            label: "إضافة صفحة ماركة",
            icon: Plus,
            onClick: () => navigate("/admin/brand-pages/new"),
            variant: "primary",
          },
        ]}
      />

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((b) => (
            <div key={b.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="aspect-[16/9] bg-muted relative">
                {b.hero_image ? (
                  <img src={b.hero_image} alt={b.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    لا توجد صورة رئيسية
                  </div>
                )}
                {b.logo_url && (
                  <img
                    src={b.logo_url}
                    alt=""
                    className="absolute bottom-3 right-3 h-10 bg-white/95 rounded p-1"
                  />
                )}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading">{b.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${b.is_active ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"}`}>
                    {b.is_active ? "نشطة" : "معطلة"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">/{b.slug || "—"}</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/brand-pages/${b.id}`)}>
                    تعديل
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/admin/brand-sections/${b.id}`)}>
                    <Layers className="w-4 h-4 ml-1" /> أقسام
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => b.slug && window.open(`/brands/${b.slug}`, "_blank")}
                    disabled={!b.slug}
                  >
                    <ExternalLink className="w-4 h-4 ml-1" /> عرض
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {brands.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              لا توجد صفحات ماركات بعد
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBrandPagesPage;