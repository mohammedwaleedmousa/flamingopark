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
  <div className="min-h-screen space-y-8 max-w-[1500px] mx-auto px-4 md:px-6 py-8" dir="rtl">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-[32px] overflow-hidden animate-pulse">
            <div className="h-64 bg-muted" />
            <div className="p-6 space-y-4">
              <div className="h-6 bg-muted rounded-full w-1/2" />
              <div className="h-4 bg-muted rounded-full w-3/4" />
              <div className="h-12 bg-muted rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
        {brands.map((b) => (
          <div key={b.id} className="group bg-card border border-border rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
            <div className="relative h-64 overflow-hidden bg-muted">
              {b.hero_image ? (
                <img loading="lazy" src={b.hero_image} alt={b.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  لا توجد صورة رئيسية
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              <div className="absolute top-5 left-5">
                <span className={`text-xs px-4 py-2 rounded-full backdrop-blur-md font-medium ${b.is_active ? "bg-white/90 text-green-700" : "bg-white/90 text-red-700"}`}>
                  {b.is_active ? "نشطة" : "معطلة"}
                </span>
              </div>

              {b.logo_url && (
                <div className="absolute bottom-5 right-5 w-20 h-20 bg-white rounded-3xl shadow-xl border border-white/50 flex items-center justify-center p-3">
                  <img loading="lazy" src={b.logo_url} alt={b.name} className="w-full h-full object-contain" />
                </div>
              )}

              <div className="absolute bottom-6 left-6 right-28 text-white">
                <h3 className="font-heading text-2xl font-semibold tracking-wide">
                  {b.name}
                </h3>
                <p className="text-xs text-white/80 mt-1">
                  /{b.slug || "بدون رابط"}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-semibold">
                    {b.sort_order ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الترتيب
                  </p>
                </div>

                <div className="bg-muted/50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-semibold">
                    صفحة
                  </p>
                  <p className="text-xs text-muted-foreground">
                    نوع المحتوى
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-2xl hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200"
                  onClick={() => navigate(`/admin/brand-pages/${b.id}`)}
                >
                  تعديل
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-2xl hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200"
                  onClick={() => navigate(`/admin/brand-sections/${b.id}`)}
                >
                  <Layers className="w-4 h-4 ml-1" />
                  أقسام
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-2xl hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200"
                  onClick={() => b.slug && window.open(`/brands/${b.slug}`, "_blank")}
                  disabled={!b.slug}
                >
                  <ExternalLink className="w-4 h-4 ml-1" />
                  عرض
                </Button>
              </div>
            </div>
          </div>
        ))}

        {brands.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Layers className="w-16 h-16 mb-5 opacity-30" />
            <h3 className="text-xl font-semibold text-foreground">
              لا توجد صفحات ماركات
            </h3>
            <p className="text-sm mt-2">
              ابدأ بإضافة أول صفحة ماركة للمتجر
            </p>
          </div>
        )}
      </div>
    )}
  </div>
);
};

export default AdminBrandPagesPage;