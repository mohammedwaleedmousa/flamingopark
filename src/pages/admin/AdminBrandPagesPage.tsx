import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, CircleOff, ExternalLink, Image as ImageIcon, Layers3, LayoutTemplate, Loader2, Pencil, Plus, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  hero_image: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

type StatusFilter = "all" | "active" | "inactive";
type PageFilter = "all" | "ready" | "missing";

const AdminBrandPagesPage = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pageFilter, setPageFilter] = useState<PageFilter>("all");

  const { data: brands = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-brand-pages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brands").select("id,name,slug,logo_url,hero_image,is_active,sort_order").order("sort_order", { ascending: true }).order("name", { ascending: true });

      if (error) throw error;

      return (data || []) as BrandRow[];
    },
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const active = brands.filter((brand) => brand.is_active).length;
    const inactive = brands.length - active;
    const ready = brands.filter((brand) => Boolean(brand.slug && brand.hero_image)).length;

    return {
      total: brands.length,
      active,
      inactive,
      ready,
    };
  }, [brands]);

  const filteredBrands = useMemo(() => {
    const query = search.trim().toLowerCase();

    return brands.filter((brand) => {
      const matchesSearch = !query || brand.name.toLowerCase().includes(query) || String(brand.slug || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(brand.is_active)) ||
        (statusFilter === "inactive" && !brand.is_active);

      const pageReady = Boolean(brand.slug && brand.hero_image);
      const matchesPage =
        pageFilter === "all" ||
        (pageFilter === "ready" && pageReady) ||
        (pageFilter === "missing" && !pageReady);

      return matchesSearch && matchesStatus && matchesPage;
    });
  }, [brands, search, statusFilter, pageFilter]);

  const hasFilters = Boolean(search.trim()) || statusFilter !== "all" || pageFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPageFilter("all");
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="الماركات" title="صفحات الماركات" description={`${stats.total.toLocaleString("ar-EG")} صفحة ماركة مرتبطة بكتالوج المتجر`} actions={[{ label: "إضافة صفحة ماركة", icon: Plus, onClick: () => navigate("/admin/brand-pages/new"), variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <BrandPageStatCard title="إجمالي الصفحات" value={stats.total} helper="جميع الماركات المسجلة" icon={LayoutTemplate} tone="indigo" />
        <BrandPageStatCard title="الصفحات النشطة" value={stats.active} helper={`${stats.inactive} صفحة معطلة`} icon={CheckCircle2} tone="green" />
        <BrandPageStatCard title="جاهزة للعرض" value={stats.ready} helper="رابط وصورة رئيسية متوفران" icon={ImageIcon} tone="blue" />
        <BrandPageStatCard title="تحتاج إكمال" value={stats.total - stats.ready} helper="ينقصها رابط أو صورة رئيسية" icon={CircleOff} tone="coral" />
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#444B55]">البحث والتصفية</h2>
            <p className="mt-[3px] text-[8px] text-[#9BA2AC]">ابحث باسم الماركة أو الرابط وراجع حالة الصفحة</p>
          </div>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="flex h-[30px] items-center gap-[5px] rounded-[8px] px-[8px] text-[8px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]">
              <X className="h-[10px] w-[10px]" />
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[11px] lg:grid-cols-[minmax(0,1fr)_175px_190px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم الماركة أو slug..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] pl-[34px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />

            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute left-[8px] top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center rounded-[7px] text-[#9AA1AB] hover:bg-white">
                <X className="h-[11px] w-[11px]" />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشطة</SelectItem>
              <SelectItem value="inactive">معطلة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pageFilter} onValueChange={(value) => setPageFilter(value as PageFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الصفحات</SelectItem>
              <SelectItem value="ready">جاهزة للعرض</SelectItem>
              <SelectItem value="missing">تحتاج إكمال</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#454C56]">دليل صفحات الماركات</h2>
            <p className="mt-[3px] text-[8px] text-[#9CA3AC]">{filteredBrands.length.toLocaleString("ar-EG")} نتيجة ظاهرة</p>
          </div>

          {isFetching && (
            <span className="flex items-center gap-[5px] text-[8px] text-[#969DA7]">
              <Loader2 className="h-[10px] w-[10px] animate-spin" />
              تحديث...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px]">
            <thead>
              <tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[9px] font-semibold text-[#858D97]">
                <th className="w-[78px] px-[12px] text-right">الشعار</th>
                <th className="px-[12px] text-right">الماركة</th>
                <th className="px-[12px] text-right">الرابط</th>
                <th className="px-[12px] text-right">الصفحة</th>
                <th className="px-[12px] text-right">الترتيب</th>
                <th className="px-[12px] text-right">الحالة</th>
                <th className="w-[170px] px-[12px] text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="h-[260px] text-center">
                    <Loader2 className="mx-auto h-[20px] w-[20px] animate-spin text-[#675CBA]" />
                  </td>
                </tr>
              ) : filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <BrandPagesEmpty />
                  </td>
                </tr>
              ) : (
                filteredBrands.map((brand) => {
                  const ready = Boolean(brand.slug && brand.hero_image);

                  return (
                    <tr key={brand.id} className="h-[68px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                      <td className="px-[12px]">
                        <BrandLogo brand={brand} />
                      </td>

                      <td className="px-[12px]">
                        <div className="min-w-[190px]">
                          <p className="max-w-[240px] truncate text-[10.5px] font-semibold text-[#414953]">{brand.name}</p>
                          <p className="mt-[4px] text-[7px] text-[#9BA2AC]">صفحة ماركة مخصصة</p>
                        </div>
                      </td>

                      <td className="px-[12px]">
                        {brand.slug ? (
                          <div className="flex items-center gap-[5px]">
                            <ExternalLink className="h-[9px] w-[9px] shrink-0 text-[#9AA1AB]" />
                            <span dir="ltr" className="block max-w-[180px] truncate text-right text-[8px] font-medium text-[#737C87]">/brands/{brand.slug}</span>
                          </div>
                        ) : (
                          <span className="inline-flex h-[25px] items-center rounded-[7px] border border-[#EEDFC4] bg-[#FFF7E8] px-[7px] text-[6.5px] font-semibold text-[#A9782F]">بدون رابط</span>
                        )}
                      </td>

                      <td className="px-[12px]">
                        <div>
                          <span className={cn("inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[6.5px] font-semibold", ready ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]")}>
                            {ready ? <CheckCircle2 className="h-[8px] w-[8px]" /> : <CircleOff className="h-[8px] w-[8px]" />}
                            {ready ? "جاهزة" : "تحتاج إكمال"}
                          </span>

                          {!brand.hero_image && <p className="mt-[3px] text-[6px] text-[#A0A6AF]">لا توجد صورة رئيسية</p>}
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <span className="inline-flex h-[26px] min-w-[32px] items-center justify-center rounded-[7px] bg-[#F2F4F7] px-[8px] text-[8px] font-semibold text-[#727A84]">{brand.sort_order ?? 0}</span>
                      </td>

                      <td className="px-[12px]">
                        <BrandPageStatus active={Boolean(brand.is_active)} />
                      </td>

                      <td className="px-[12px]">
                        <div className="flex items-center justify-center gap-[4px]">
                          <button type="button" onClick={() => navigate(`/admin/brand-pages/${brand.id}`)} className="flex h-[30px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white px-[8px] text-[7px] font-semibold text-[#675CBA] hover:bg-[#F5F3FF]">
                            <Pencil className="h-[9px] w-[9px]" />
                            تعديل
                          </button>

                          <button type="button" onClick={() => navigate(`/admin/brand-sections/${brand.id}`)} className="flex h-[30px] items-center justify-center gap-[5px] rounded-[8px] border border-[#DCE7F4] bg-white px-[8px] text-[7px] font-semibold text-[#5680CF] hover:bg-[#F3F7FC]">
                            <Layers3 className="h-[9px] w-[9px]" />
                            أقسام
                          </button>

                          <button type="button" disabled={!brand.slug} onClick={() => brand.slug && window.open(`/brands/${brand.slug}`, "_blank", "noopener,noreferrer")} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#707884] hover:bg-[#F7F8FA] disabled:cursor-not-allowed disabled:opacity-35" title="عرض الصفحة">
                            <ExternalLink className="h-[10px] w-[10px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-[8px] md:hidden">
        {isLoading ? (
          <div className="flex h-[220px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
            <Loader2 className="h-[20px] w-[20px] animate-spin text-[#675CBA]" />
          </div>
        ) : filteredBrands.length === 0 ? (
          <BrandPagesEmpty />
        ) : (
          filteredBrands.map((brand) => {
            const ready = Boolean(brand.slug && brand.hero_image);

            return (
              <article key={brand.id} className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
                <div className="p-[11px]">
                  <div className="flex gap-[10px]">
                    <BrandLogo brand={brand} mobile />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-[7px]">
                        <div className="min-w-0">
                          <h3 className="truncate text-[11px] font-semibold text-[#3B424C]">{brand.name}</h3>
                          <p dir="ltr" className="mt-[3px] truncate text-right text-[7px] text-[#9299A3]">{brand.slug ? `/brands/${brand.slug}` : "بدون رابط"}</p>
                        </div>

                        <BrandPageStatus active={Boolean(brand.is_active)} />
                      </div>

                      <div className="mt-[8px] flex flex-wrap gap-[5px]">
                        <span className={cn("rounded-[6px] px-[7px] py-[4px] text-[7px] font-semibold", ready ? "bg-[#EFF8F2] text-[#568468]" : "bg-[#FFF7E8] text-[#A9782F]")}>{ready ? "جاهزة للعرض" : "تحتاج إكمال"}</span>
                        <span className="rounded-[6px] bg-[#F2F4F7] px-[7px] py-[4px] text-[7px] font-semibold text-[#757D87]">الترتيب #{brand.sort_order ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {brand.hero_image && (
                  <div className="mx-[11px] mb-[10px] h-[92px] overflow-hidden rounded-[9px] border border-[#E7EAEF] bg-[#F5F6F8]">
                    <img src={brand.hero_image} alt={brand.name} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                )}

                <div className="grid grid-cols-[1fr_1fr_42px] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                  <button type="button" onClick={() => navigate(`/admin/brand-pages/${brand.id}`)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[8px] font-semibold text-[#675CBA]">
                    <Pencil className="h-[10px] w-[10px]" />
                    تعديل
                  </button>

                  <button type="button" onClick={() => navigate(`/admin/brand-sections/${brand.id}`)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#DCE7F4] bg-white text-[8px] font-semibold text-[#5680CF]">
                    <Layers3 className="h-[10px] w-[10px]" />
                    الأقسام
                  </button>

                  <button type="button" disabled={!brand.slug} onClick={() => brand.slug && window.open(`/brands/${brand.slug}`, "_blank", "noopener,noreferrer")} className="flex h-[35px] w-[42px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#707884] disabled:opacity-35">
                    <ExternalLink className="h-[10px] w-[10px]" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
};

const BrandPageStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: number; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "coral" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <article className="relative min-h-[116px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} />
      <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div>
      <p className="mt-[12px] text-[8.5px] font-medium text-[#8D949E]">{title}</p>
      <p className="mt-[4px] text-[20px] font-semibold leading-none text-[#303741]">{value.toLocaleString("en-US")}</p>
      <p className="mt-[6px] text-[7px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

const BrandLogo = ({ brand, mobile = false }: { brand: BrandRow; mobile?: boolean }) => {
  const box = mobile ? "h-[62px] w-[62px] rounded-[11px] p-[9px]" : "h-[48px] w-[48px] rounded-[9px] p-[7px]";

  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden border border-[#E8EBEF] bg-white", box)}>
      {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} loading="lazy" className="h-full w-full object-contain" /> : <LayoutTemplate className="h-[14px] w-[14px] text-[#9AA1AB]" />}
    </div>
  );
};

const BrandPageStatus = ({ active }: { active: boolean }) => {
  return (
    <span className={cn("inline-flex h-[24px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[6.5px] font-semibold", active ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]")}>
      <span className={cn("h-[5px] w-[5px] rounded-full", active ? "bg-[#629067]" : "bg-[#969EA8]")} />
      {active ? "نشطة" : "معطلة"}
    </span>
  );
};

const BrandPagesEmpty = () => {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[14px] bg-white px-6 text-center">
      <div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]">
        <Layers3 className="h-[18px] w-[18px]" />
      </div>

      <h3 className="mt-3 text-[10px] font-semibold text-[#535B65]">لا توجد صفحات ماركات</h3>
      <p className="mt-[4px] text-[7px] text-[#9BA2AC]">لم نجد صفحات مطابقة للبحث والفلاتر الحالية.</p>
    </div>
  );
};

export default AdminBrandPagesPage;