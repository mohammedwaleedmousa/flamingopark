import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle2, ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Layers3, LayoutGrid, Link2, Loader2, Pencil, Plus, Search, ShoppingBag, Sparkles, Trash2, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HomepageSection {
  id: string;
  title: string;
  title_ar: string;
  section_type: string;
  filter_type: string | null;
  countries: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
  max_products: number | null;
  show_view_all: boolean | null;
  view_all_link: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ProductSectionRow {
  id: string;
  section_ids: string[] | null;
}

type SectionForm = {
  title: string;
  title_ar: string;
  section_type: string;
  filter_type: string;
  countries: string[];
  is_active: boolean;
  sort_order: number;
  max_products: number;
  show_view_all: boolean;
  view_all_link: string;
};

type StatusFilter = "all" | "active" | "inactive";

const SINGLE_COUNTRY = "GLOBAL";

const filterTypes = [
  { value: "featured", label: "منتجات مميزة", icon: Sparkles },
  { value: "best_seller", label: "الأكثر مبيعًا", icon: ShoppingBag },
  { value: "discounted", label: "عروض وخصومات", icon: Sparkles },
  { value: "new", label: "منتجات جديدة", icon: Plus },
  { value: "all", label: "جميع المنتجات", icon: LayoutGrid },
];

const emptyForm = (sortOrder = 0): SectionForm => ({
  title: "",
  title_ar: "",
  section_type: "products",
  filter_type: "featured",
  countries: [SINGLE_COUNTRY],
  is_active: true,
  sort_order: sortOrder,
  max_products: 8,
  show_view_all: true,
  view_all_link: "/products",
});

const AdminSectionsPage = () => {
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomepageSection | null>(null);
  const [movingSectionId, setMovingSectionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formData, setFormData] = useState<SectionForm>(emptyForm());

  /* =========================================================
     DATA
  ========================================================= */

  const { data: sections = [], isLoading, isFetching } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("homepage_sections").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []) as HomepageSection[];
    },
    staleTime: 20_000,
  });

  const { data: assignedProducts = [] } = useQuery({
    queryKey: ["homepage-section-product-links"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,section_ids").eq("is_active", true);

      if (error) throw error;

      return (data || []) as ProductSectionRow[];
    },
    staleTime: 20_000,
  });

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    assignedProducts.forEach((product) => {
      const uniqueIds = new Set(product.section_ids || []);

      uniqueIds.forEach((sectionId) => {
        counts[sectionId] = (counts[sectionId] || 0) + 1;
      });
    });

    return counts;
  }, [assignedProducts]);

  const stats = useMemo(() => {
    const active = sections.filter((section) => section.is_active).length;
    const withProducts = sections.filter((section) => (productCounts[section.id] || 0) > 0).length;
    const withViewAll = sections.filter((section) => section.show_view_all).length;

    return {
      total: sections.length,
      active,
      inactive: sections.length - active,
      withProducts,
      withViewAll,
    };
  }, [sections, productCounts]);

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sections.filter((section) => {
      const filterLabel = getFilterLabel(section.filter_type || "");

      const matchesSearch =
        !query ||
        section.title_ar.toLowerCase().includes(query) ||
        section.title.toLowerCase().includes(query) ||
        filterLabel.toLowerCase().includes(query) ||
        String(section.view_all_link || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(section.is_active)) ||
        (statusFilter === "inactive" && !section.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [sections, search, statusFilter]);

  /* =========================================================
     FORM
  ========================================================= */

  const resetForm = () => {
    setEditingSection(null);
    setFormData(emptyForm(sections.length));
    setIsDialogOpen(false);
  };

  const openCreate = () => {
    setEditingSection(null);
    setFormData(emptyForm(sections.length));
    setIsDialogOpen(true);
  };

  const handleEdit = (section: HomepageSection) => {
    setEditingSection(section);
    setFormData({
      title: section.title || "",
      title_ar: section.title_ar || "",
      section_type: section.section_type || "products",
      filter_type: section.filter_type || "featured",
      countries: section.countries || [SINGLE_COUNTRY],
      is_active: section.is_active ?? true,
      sort_order: section.sort_order ?? 0,
      max_products: section.max_products ?? 8,
      show_view_all: section.show_view_all ?? true,
      view_all_link: section.view_all_link || "/products",
    });
    setIsDialogOpen(true);
  };

  /* =========================================================
     CREATE / UPDATE
  ========================================================= */

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: SectionForm }) => {
      const titleAr = data.title_ar.trim();
      const title = data.title.trim();

      if (!titleAr) throw new Error("العنوان العربي مطلوب.");
      if (!title) throw new Error("العنوان الإنجليزي مطلوب.");
      if (data.max_products < 1) throw new Error("عدد المنتجات يجب أن يكون 1 على الأقل.");

      const payload = {
        title,
        title_ar: titleAr,
        section_type: data.section_type,
        filter_type: data.filter_type,
        countries: [SINGLE_COUNTRY],
        is_active: data.is_active,
        sort_order: Math.max(0, Number(data.sort_order || 0)),
        max_products: Math.max(1, Math.min(60, Number(data.max_products || 8))),
        show_view_all: data.show_view_all,
        view_all_link: data.show_view_all ? data.view_all_link.trim() || "/products" : null,
      };

      if (id) {
        const { error } = await supabase.from("homepage_sections").update(payload).eq("id", id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("homepage_sections").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(editingSection ? "تم تحديث القسم بنجاح" : "تم إضافة القسم بنجاح");
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
    },
    onError: (error: any) => {
      toast.error(error?.message || "حدث خطأ أثناء حفظ القسم");
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    saveMutation.mutate({
      id: editingSection?.id,
      data: formData,
    });
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      toast.success("تم حذف القسم بنجاح");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["homepage-sections"] }),
        queryClient.invalidateQueries({ queryKey: ["homepage-section-product-links"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
      ]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "حدث خطأ أثناء حذف القسم");
    },
  });

  /* =========================================================
     ACTIVE
  ========================================================= */

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("homepage_sections").update({ is_active }).eq("id", id);
      if (error) throw error;
      return { id, is_active };
    },
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ["homepage-sections"] });

      const previous = queryClient.getQueryData<HomepageSection[]>(["homepage-sections"]);

      queryClient.setQueryData<HomepageSection[]>(["homepage-sections"], (current = []) => current.map((section) => section.id === id ? { ...section, is_active } : section));

      return { previous };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["homepage-sections"], context.previous);
      toast.error(error?.message || "تعذر تحديث حالة القسم");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
    },
  });

  /* =========================================================
     ORDER
  ========================================================= */

  const moveSection = async (section: HomepageSection, direction: "up" | "down") => {
    const index = sections.findIndex((item) => item.id === section.id);
    if (index < 0) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const previous = [...sections];
    const reordered = [...sections];
    const temp = reordered[index];

    reordered[index] = reordered[newIndex];
    reordered[newIndex] = temp;

    const normalized = reordered.map((item, itemIndex) => ({
      ...item,
      sort_order: itemIndex,
    }));

    setMovingSectionId(section.id);
    queryClient.setQueryData(["homepage-sections"], normalized);

    try {
      const results = await Promise.all(normalized.map((item) => supabase.from("homepage_sections").update({ sort_order: item.sort_order }).eq("id", item.id)));
      const failed = results.find((result) => result.error);

      if (failed?.error) throw failed.error;

      toast.success("تم تحديث ترتيب الأقسام");
    } catch (error: any) {
      queryClient.setQueryData(["homepage-sections"], previous);
      toast.error(error?.message || "تعذر تحديث الترتيب");
    } finally {
      setMovingSectionId(null);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="واجهة المتجر" title="أقسام الصفحة الرئيسية" description={`${stats.total.toLocaleString("ar-EG")} أقسام لعرض المنتجات داخل الواجهة`} actions={[{ label: "إضافة قسم", icon: Plus, onClick: openCreate, variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <SectionStatCard title="إجمالي الأقسام" value={stats.total} helper="جميع أقسام الصفحة الرئيسية" icon={LayoutGrid} tone="indigo" />
        <SectionStatCard title="الأقسام النشطة" value={stats.active} helper={`${stats.inactive} قسم معطل`} icon={CheckCircle2} tone="green" />
        <SectionStatCard title="بها منتجات" value={stats.withProducts} helper="مرتبطة بمنتجات فعليًا" icon={ShoppingBag} tone="blue" />
        <SectionStatCard title="عرض الكل" value={stats.withViewAll} helper="تظهر رابط عرض الكل" icon={Link2} tone="coral" />
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#444B55]">البحث والتصفية</h2>
            <p className="mt-[3px] text-[8px] text-[#9BA2AC]">ابحث باسم القسم أو نوعه أو الرابط</p>
          </div>

          {(search || statusFilter !== "all") && (
            <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="flex h-[30px] items-center gap-[5px] rounded-[8px] px-[8px] text-[8px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]">
              <X className="h-[10px] w-[10px]" />
              مسح
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[11px] lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن قسم..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
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
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#454C56]">ترتيب أقسام الواجهة</h2>
            <p className="mt-[3px] text-[8px] text-[#9CA3AC]">ترتيب القائمة هنا يحدد ترتيب الأقسام الديناميكية في المتجر</p>
          </div>

          {isFetching && <Loader2 className="h-[13px] w-[13px] animate-spin text-[#8E959F]" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[9px] font-semibold text-[#858D97]">
                <th className="w-[60px] px-[10px] text-center">الترتيب</th>
                <th className="px-[12px] text-right">القسم</th>
                <th className="px-[12px] text-right">النوع</th>
                <th className="px-[12px] text-right">المنتجات المرتبطة</th>
                <th className="px-[12px] text-right">حد العرض</th>
                <th className="px-[12px] text-right">عرض الكل</th>
                <th className="px-[12px] text-right">الحالة</th>
                <th className="w-[110px] px-[12px] text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="h-[260px] text-center">
                    <Loader2 className="mx-auto h-[20px] w-[20px] animate-spin text-[#675CBA]" />
                  </td>
                </tr>
              ) : filteredSections.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptySections />
                  </td>
                </tr>
              ) : (
                filteredSections.map((section) => {
                  const originalIndex = sections.findIndex((item) => item.id === section.id);
                  const count = productCounts[section.id] || 0;
                  const moving = movingSectionId === section.id;

                  return (
                    <tr key={section.id} className="h-[66px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                      <td className="px-[10px]">
                        <div className="flex items-center justify-center gap-[2px]">
                          <div className="flex flex-col">
                            <button type="button" disabled={originalIndex <= 0 || Boolean(movingSectionId)} onClick={() => void moveSection(section, "up")} className="flex h-[20px] w-[24px] items-center justify-center rounded-[6px] text-[#8D949E] hover:bg-[#F1F3F6] disabled:opacity-25">
                              <ChevronUp className="h-[9px] w-[9px]" />
                            </button>
                            <button type="button" disabled={originalIndex >= sections.length - 1 || Boolean(movingSectionId)} onClick={() => void moveSection(section, "down")} className="flex h-[20px] w-[24px] items-center justify-center rounded-[6px] text-[#8D949E] hover:bg-[#F1F3F6] disabled:opacity-25">
                              <ChevronDown className="h-[9px] w-[9px]" />
                            </button>
                          </div>

                          <span className="flex items-center gap-[3px] text-[7px] font-semibold text-[#9BA2AC]">
                            {moving ? <Loader2 className="h-[9px] w-[9px] animate-spin" /> : <GripVertical className="h-[9px] w-[9px]" />}
                            {originalIndex + 1}
                          </span>
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <div className="min-w-[220px]">
                          <p className="max-w-[260px] truncate text-[10.5px] font-semibold text-[#414953]">{section.title_ar}</p>
                          <p className="mt-[3px] max-w-[260px] truncate text-[7px] text-[#9AA2AC]">{section.title}</p>
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <FilterBadge value={section.filter_type || "featured"} />
                      </td>

                      <td className="px-[12px]">
                        <div>
                          <span className={cn("inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[6.5px] font-semibold", count > 0 ? "border-[#DCE7F4] bg-[#F1F6FC] text-[#5679A4]" : "border-[#E4E7EB] bg-[#F5F6F8] text-[#858D97]")}>
                            <ShoppingBag className="h-[8px] w-[8px]" />
                            {count} منتج
                          </span>
                          {count === 0 && <p className="mt-[3px] text-[6px] text-[#A0A6AF]">لن يظهر القسم للعميل حتى تربط منتجات به</p>}
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <span className="inline-flex h-[25px] min-w-[34px] items-center justify-center rounded-[7px] bg-[#F2F4F7] px-[7px] text-[7px] font-semibold text-[#727A84]">{section.max_products ?? 8}</span>
                      </td>

                      <td className="px-[12px]">
                        {section.show_view_all ? (
                          <div className="flex items-center gap-[5px]">
                            <Eye className="h-[10px] w-[10px] text-[#57906A]" />
                            <span className="max-w-[140px] truncate text-[7px] font-medium text-[#69727C]">{section.view_all_link || "/products"}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-[5px] text-[#9BA2AC]">
                            <EyeOff className="h-[10px] w-[10px]" />
                            <span className="text-[7px]">مخفي</span>
                          </div>
                        )}
                      </td>

                      <td className="px-[12px]">
                        <div className="flex items-center gap-[7px]">
                          <Switch checked={section.is_active ?? true} onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: section.id, is_active: checked })} />
                          <span className={cn("text-[7px] font-semibold", section.is_active ? "text-[#568468]" : "text-[#8B929C]")}>{section.is_active ? "نشط" : "معطل"}</span>
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <div className="flex items-center justify-center gap-[4px]">
                          <button type="button" title="تعديل القسم" onClick={() => handleEdit(section)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#675CBA] transition-colors hover:bg-[#F5F3FF]">
                            <Pencil className="h-[11px] w-[11px]" />
                          </button>

                          <button type="button" title="حذف القسم" onClick={() => setDeleteTarget(section)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] transition-colors hover:bg-[#FFF3F1]">
                            <Trash2 className="h-[11px] w-[11px]" />
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
        ) : filteredSections.length === 0 ? (
          <EmptySections />
        ) : (
          filteredSections.map((section) => {
            const count = productCounts[section.id] || 0;
            const originalIndex = sections.findIndex((item) => item.id === section.id);

            return (
              <article key={section.id} className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
                <div className="p-[11px]">
                  <div className="flex items-start justify-between gap-[8px]">
                    <div className="min-w-0">
                      <h3 className="truncate text-[11px] font-semibold text-[#3F4751]">{section.title_ar}</h3>
                      <p className="mt-[3px] truncate text-[7px] text-[#9299A3]">{section.title}</p>
                    </div>

                    <Switch checked={section.is_active ?? true} onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: section.id, is_active: checked })} />
                  </div>

                  <div className="mt-[9px] flex flex-wrap gap-[5px]">
                    <FilterBadge value={section.filter_type || "featured"} />
                    <span className="inline-flex h-[25px] items-center rounded-[7px] border border-[#DCE7F4] bg-[#F1F6FC] px-[7px] text-[6.5px] font-semibold text-[#5679A4]">{count} منتج</span>
                    <span className="inline-flex h-[25px] items-center rounded-[7px] bg-[#F2F4F7] px-[7px] text-[6.5px] font-semibold text-[#727A84]">حد العرض {section.max_products ?? 8}</span>
                  </div>
                </div>

                <div className="grid grid-cols-[40px_40px_1fr_1fr] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                  <button type="button" disabled={originalIndex <= 0 || Boolean(movingSectionId)} onClick={() => void moveSection(section, "up")} className="flex h-[34px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#7C848E] disabled:opacity-30">
                    <ChevronUp className="h-[10px] w-[10px]" />
                  </button>

                  <button type="button" disabled={originalIndex >= sections.length - 1 || Boolean(movingSectionId)} onClick={() => void moveSection(section, "down")} className="flex h-[34px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#7C848E] disabled:opacity-30">
                    <ChevronDown className="h-[10px] w-[10px]" />
                  </button>

                  <button type="button" onClick={() => handleEdit(section)} className="flex h-[34px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[8px] font-semibold text-[#675CBA]">
                    <Pencil className="h-[10px] w-[10px]" />
                    تعديل
                  </button>

                  <button type="button" onClick={() => setDeleteTarget(section)} className="flex h-[34px] items-center justify-center gap-[5px] rounded-[8px] border border-[#F0D7D4] bg-white text-[8px] font-semibold text-[#C15F56]">
                    <Trash2 className="h-[10px] w-[10px]" />
                    حذف
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* =====================================================
          EDITOR
      ===================================================== */}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open && !saveMutation.isPending) resetForm(); else if (open) setIsDialogOpen(true); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[700px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                {editingSection ? <Pencil className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}
              </div>

              <div>
                <DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">{editingSection ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[8px] text-[#9299A3]">إدارة عنوان القسم، عدد المنتجات، ترتيب الظهور ورابط عرض الكل.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="معلومات القسم" icon={LayoutGrid}>
                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="العنوان بالعربي" required>
                    <Input value={formData.title_ar} onChange={(event) => setFormData((current) => ({ ...current, title_ar: event.target.value }))} placeholder="مثال: وصل حديثًا" dir="rtl" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>

                  <Field label="العنوان بالإنجليزي" required>
                    <Input value={formData.title} onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))} placeholder="New Arrivals" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>
                </div>

                <Field label="نوع القسم">
                  <Select value={formData.filter_type} onValueChange={(value) => setFormData((current) => ({ ...current, filter_type: value }))}>
                    <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filterTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p className="mt-[5px] text-[6.5px] leading-5 text-[#9BA2AC]">المنتجات التي تظهر فعليًا هي المنتجات المرتبطة بهذا القسم من إدارة المنتج.</p>
                </Field>
              </FormSection>

              <FormSection title="العرض والترتيب" icon={Layers3}>
                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="ترتيب القسم">
                    <Input type="number" min={0} value={formData.sort_order} onChange={(event) => setFormData((current) => ({ ...current, sort_order: Number.parseInt(event.target.value, 10) || 0 }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>

                  <Field label="الحد الأقصى للمنتجات">
                    <Input type="number" min={1} max={60} value={formData.max_products} onChange={(event) => setFormData((current) => ({ ...current, max_products: Number.parseInt(event.target.value, 10) || 1 }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <div className="flex min-h-[63px] items-center justify-between rounded-[10px] border border-[#E5E9EF] bg-[#F8FAFC] px-[10px]">
                    <div>
                      <p className="text-[8.5px] font-semibold text-[#555D67]">حالة القسم</p>
                      <p className="mt-[2px] text-[6.5px] text-[#9BA2AC]">{formData.is_active ? "ظاهر في الواجهة" : "مخفي عن العملاء"}</p>
                    </div>
                    <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData((current) => ({ ...current, is_active: checked }))} />
                  </div>

                  <div className="flex min-h-[63px] items-center justify-between rounded-[10px] border border-[#E5E9EF] bg-[#F8FAFC] px-[10px]">
                    <div>
                      <p className="text-[8.5px] font-semibold text-[#555D67]">زر عرض الكل</p>
                      <p className="mt-[2px] text-[6.5px] text-[#9BA2AC]">{formData.show_view_all ? "يظهر للعملاء" : "مخفي"}</p>
                    </div>
                    <Switch checked={formData.show_view_all} onCheckedChange={(checked) => setFormData((current) => ({ ...current, show_view_all: checked }))} />
                  </div>
                </div>

                {formData.show_view_all && (
                  <Field label='رابط "عرض الكل"'>
                    <Input value={formData.view_all_link} onChange={(event) => setFormData((current) => ({ ...current, view_all_link: event.target.value }))} placeholder="/products" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>
                )}
              </FormSection>

              <div className="rounded-[11px] border border-[#DCE7F4] bg-[#F5F8FC] p-[10px]">
                <div className="flex items-start gap-[7px]">
                  <ShoppingBag className="mt-[1px] h-[12px] w-[12px] shrink-0 text-[#5680CF]" />
                  <div>
                    <p className="text-[8px] font-semibold text-[#526B89]">ربط المنتجات بالقسم</p>
                    <p className="mt-[3px] text-[7px] leading-5 text-[#7F8FA2]">هذا القسم لا يجلب المنتجات تلقائيًا حسب نوع الفلتر في واجهة المتجر الحالية. يجب ربط المنتجات به من صفحة إضافة/تعديل المنتج، وبعدها سيظهر عدد المنتجات الحقيقي هنا.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
              <button type="button" disabled={saveMutation.isPending} onClick={resetForm} className="h-[36px] rounded-[9px] border border-[#E1E5EA] bg-white px-4 text-[8px] font-semibold text-[#707883]">إلغاء</button>

              <button type="submit" disabled={saveMutation.isPending} className="flex h-[36px] items-center gap-[6px] rounded-[9px] bg-[#675CBA] px-5 text-[8px] font-semibold text-white hover:bg-[#594FAB] disabled:opacity-40">
                {saveMutation.isPending ? <Loader2 className="h-[11px] w-[11px] animate-spin" /> : editingSection ? <Pencil className="h-[11px] w-[11px]" /> : <Plus className="h-[11px] w-[11px]" />}
                {editingSection ? "حفظ التعديلات" : "إضافة القسم"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================
          DELETE
      ===================================================== */}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[420px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader>
            <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]">
              <Trash2 className="h-[16px] w-[16px]" />
            </div>

            <AlertDialogTitle className="text-[14px] font-semibold text-[#343A44]">حذف القسم</AlertDialogTitle>
            <AlertDialogDescription className="text-[9px] leading-6 text-[#858D97]">سيتم حذف قسم "{deleteTarget?.title_ar || ""}". المنتجات نفسها لن تُحذف، لكن لن يعود هذا القسم ظاهرًا في الصفحة الرئيسية.</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[9px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[9px] font-semibold text-white hover:bg-[#B65555]">
              {deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const getFilterLabel = (value: string) => {
  return filterTypes.find((type) => type.value === value)?.label || value || "غير محدد";
};

const FilterBadge = ({ value }: { value: string }) => {
  const config = filterTypes.find((type) => type.value === value) || filterTypes[0];
  const Icon = config.icon;

  return (
    <span className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#E2DEF3] bg-[#F6F4FF] px-[7px] text-[6.5px] font-semibold text-[#675CBA]">
      <Icon className="h-[8px] w-[8px]" />
      {config.label}
    </span>
  );
};

const SectionStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: number; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "coral" }) => {
  const styles = {
    indigo: ["bg-[#F1EFFF] text-[#675CBA]", "bg-[#675CBA]"],
    green: ["bg-[#EAF7EE] text-[#629067]", "bg-[#629067]"],
    blue: ["bg-[#EDF4FF] text-[#5680CF]", "bg-[#5680CF]"],
    coral: ["bg-[#FFF0ED] text-[#D06A5E]", "bg-[#D06A5E]"],
  }[tone];

  return (
    <article className="relative min-h-[116px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", styles[1])} />
      <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", styles[0])}><Icon className="h-[14px] w-[14px]" /></div>
      <p className="mt-[12px] text-[8.5px] text-[#8D949E]">{title}</p>
      <p className="mt-[4px] text-[20px] font-semibold leading-none text-[#303741]">{value.toLocaleString("en-US")}</p>
      <p className="mt-[6px] text-[7px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => (
  <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]">
    <div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]">
      <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div>
      <h3 className="text-[9.5px] font-semibold text-[#4A525C]">{title}</h3>
    </div>
    <div className="space-y-[9px]">{children}</div>
  </section>
);

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => (
  <div>
    <Label className="mb-[6px] block text-[8px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>
    {children}
  </div>
);

const EmptySections = () => (
  <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[14px] bg-white px-6 text-center">
    <div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]"><LayoutGrid className="h-[18px] w-[18px]" /></div>
    <h3 className="mt-3 text-[10px] font-semibold text-[#535B65]">لا توجد أقسام</h3>
    <p className="mt-[4px] text-[7px] text-[#9BA2AC]">أضف قسمًا جديدًا لعرض منتجات مختارة في الصفحة الرئيسية.</p>
  </div>
);

export default AdminSectionsPage;
