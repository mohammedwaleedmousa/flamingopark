import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle2, CircleOff, Folder, FolderTree, Grid3X3, Image as ImageIcon, Layers3, Loader2, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

interface Category {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  countries: string[] | null;
  description_ar?: string | null;
}

type CategoryForm = {
  name: string;
  name_ar: string;
  slug: string;
  parent_id: string;
  image_url: string;
  description_ar: string;
  is_active: boolean;
  sort_order: number;
  countries: string[];
};

type StatusFilter = "all" | "active" | "inactive";
type TypeFilter = "all" | "root" | "child";

const SINGLE_COUNTRY = "GLOBAL";

const emptyForm = (): CategoryForm => ({
  name: "",
  name_ar: "",
  slug: "",
  parent_id: "",
  image_url: "",
  description_ar: "",
  is_active: true,
  sort_order: 0,
  countries: [SINGLE_COUNTRY],
});

const generateSlug = (name: string) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const AdminCategoriesPage = () => {
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const [formData, setFormData] = useState<CategoryForm>(emptyForm());
  const [uploading, setUploading] = useState(false);

  /* =========================================================
     QUERY
  ========================================================= */

  const { data: categories = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name,name_ar,slug,parent_id,image_url,is_active,sort_order,countries,description_ar").order("sort_order", { ascending: true }).order("name_ar", { ascending: true });

      if (error) throw error;

      return (data || []) as Category[];
    },
    staleTime: 30_000,
  });

  /* =========================================================
     DERIVED DATA
  ========================================================= */

  const rootCategories = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);

  const childCategories = useMemo(() => categories.filter((category) => Boolean(category.parent_id)), [categories]);

  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name_ar])), [categories]);

  const childrenCountMap = useMemo(() => {
    const map = new Map<string, number>();

    categories.forEach((category) => {
      if (!category.parent_id) return;

      map.set(category.parent_id, (map.get(category.parent_id) || 0) + 1);
    });

    return map;
  }, [categories]);

  const stats = useMemo(() => {
    return {
      total: categories.length,
      active: categories.filter((category) => category.is_active).length,
      inactive: categories.filter((category) => !category.is_active).length,
      roots: rootCategories.length,
      children: childCategories.length,
    };
  }, [categories, rootCategories.length, childCategories.length]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch = !normalizedSearch || category.name.toLowerCase().includes(normalizedSearch) || category.name_ar.toLowerCase().includes(normalizedSearch) || category.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || (statusFilter === "active" && Boolean(category.is_active)) || (statusFilter === "inactive" && !category.is_active);

      const matchesType = typeFilter === "all" || (typeFilter === "root" && !category.parent_id) || (typeFilter === "child" && Boolean(category.parent_id));

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [categories, search, statusFilter, typeFilter]);

  const parentOptions = useMemo(() => rootCategories.filter((category) => category.id !== editingCategory?.id), [rootCategories, editingCategory?.id]);

  const hasFilters = Boolean(search.trim()) || statusFilter !== "all" || typeFilter !== "all";

  /* =========================================================
     FORM
  ========================================================= */

  const closeForm = () => {
    setFormData(emptyForm());
    setEditingCategory(null);
    setIsDialogOpen(false);
  };

  const openCreate = () => {
    setEditingCategory(null);
    setFormData(emptyForm());
    setIsDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);

    setFormData({
      name: category.name || "",
      name_ar: category.name_ar || "",
      slug: category.slug || "",
      parent_id: category.parent_id || "",
      image_url: category.image_url || "",
      description_ar: category.description_ar || "",
      is_active: category.is_active ?? true,
      sort_order: category.sort_order ?? 0,
      countries: category.countries || [SINGLE_COUNTRY],
    });

    setIsDialogOpen(true);
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const saveMutation = useMutation({
    mutationFn: async (payload: CategoryForm & { id?: string }) => {
      const name = payload.name.trim();
      const nameAr = payload.name_ar.trim();
      const slug = payload.slug.trim() || generateSlug(name);

      if (!name || !nameAr) throw new Error("أدخل اسم الفئة بالعربي والإنجليزي.");
      if (!slug) throw new Error("تعذر إنشاء رابط صالح للفئة.");

      const categoryData = {
        name,
        name_ar: nameAr,
        slug,
        image_url: payload.image_url || null,
        description_ar: payload.description_ar.trim() || null,
        parent_id: payload.parent_id || null,
        is_active: payload.is_active,
        sort_order: Number(payload.sort_order || 0),
        countries: payload.countries,
      };

      if (payload.id) {
        const { error } = await supabase.from("categories").update(categoryData).eq("id", payload.id);

        if (error) throw error;

        return;
      }

      const { error } = await supabase.from("categories").insert(categoryData);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });

      toast({
        title: editingCategory ? "تم تحديث الفئة" : "تم إضافة الفئة",
        description: editingCategory ? "تم حفظ التعديلات بنجاح." : "تم إنشاء الفئة الجديدة بنجاح.",
      });

      closeForm();
    },
    onError: (error: any) => {
      console.error("Category save error:", error);

      toast({
        title: "تعذر حفظ الفئة",
        description: error?.message || "حدث خطأ أثناء الحفظ.",
        variant: "destructive",
      });
    },
  });

  /* =========================================================
     TOGGLE ACTIVE
  ========================================================= */

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);

      if (error) throw error;

      return { id, is_active };
    },

    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-categories"] });

      const previous = queryClient.getQueryData<Category[]>(["admin-categories"]);

      queryClient.setQueryData<Category[]>(["admin-categories"], (current = []) => current.map((category) => category.id === id ? { ...category, is_active } : category));

      return { previous };
    },

    onError: (error: any, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["admin-categories"], context.previous);

      toast({
        title: "تعذر تحديث الحالة",
        description: error?.message || "حدث خطأ أثناء تحديث الفئة.",
        variant: "destructive",
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteMutation = useMutation({
    mutationFn: async (category: Category) => {
      const childrenCount = childrenCountMap.get(category.id) || 0;

      if (childrenCount > 0) {
        throw new Error(`هذه الفئة تحتوي على ${childrenCount} فئة فرعية. انقل أو احذف الفئات الفرعية أولًا.`);
      }

      const { error } = await supabase.from("categories").delete().eq("id", category.id);

      if (error) throw error;
    },

    onSuccess: async () => {
      setDeleteCategory(null);

      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });

      toast({
        title: "تم حذف الفئة",
        description: "تم حذف الفئة من الكتالوج.",
      });
    },

    onError: (error: any) => {
      toast({
        title: "تعذر حذف الفئة",
        description: error?.message || "حدث خطأ أثناء الحذف.",
        variant: "destructive",
      });
    },
  });

  /* =========================================================
     IMAGE UPLOAD
  ========================================================= */

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      const [{ default: imageCompression }, { default: heic2any }] = await Promise.all([import("browser-image-compression"), import("heic2any")]);

      let uploadFile: File = file;

      const extension = file.name.split(".").pop()?.toLowerCase();

      const isHeic = extension === "heic" || extension === "heif" || file.type === "image/heic" || file.type === "image/heif";

      if (isHeic) {
        try {
          const converted = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.9,
          });

          const convertedBlob = Array.isArray(converted) ? converted[0] : converted;

          uploadFile = new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
            type: "image/jpeg",
          });
        } catch (error: any) {
          const browserReadable = String(error?.message || "").toLowerCase().includes("already browser readable");

          if (!browserReadable) throw error;

          uploadFile = file;
        }
      }

      const compressedFile = await imageCompression(uploadFile, {
        maxSizeMB: 0.45,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: "image/webp",
        initialQuality: 0.86,
      });

      const uniquePart = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const path = `categories/${uniquePart}.webp`;

      const { error: uploadError } = await supabase.storage.from("uploads").upload(path, compressedFile, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("uploads").getPublicUrl(path);

      setFormData((current) => ({
        ...current,
        image_url: data.publicUrl,
      }));

      toast({
        title: "تم رفع الصورة",
        description: "تم تحسين الصورة وتحويلها إلى WebP.",
      });
    } catch (error: any) {
      console.error("Category image upload error:", error);

      toast({
        title: "فشل رفع الصورة",
        description: error?.message || "تعذر معالجة الصورة.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    saveMutation.mutate({
      ...formData,
      id: editingCategory?.id,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (isLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
            <Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" />
          </div>

          <p className="mt-3 text-[8px] font-medium text-[#969DA7]">جاري تحميل الفئات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <AdminPageHeader category="الكتالوج والمخزون" title="إدارة الفئات" description={`${stats.total.toLocaleString("ar-EG")} فئة داخل هيكل الكتالوج`} actions={[{ label: "إضافة فئة", icon: Plus, onClick: openCreate, variant: "primary" }]} />

      {/* =====================================================
          STATS
      ===================================================== */}

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <CategoryStatCard title="إجمالي الفئات" value={stats.total} helper="جميع أقسام الكتالوج" icon={Grid3X3} tone="indigo" />
        <CategoryStatCard title="الفئات النشطة" value={stats.active} helper={`${stats.inactive} فئة معطلة`} icon={CheckCircle2} tone="green" />
        <CategoryStatCard title="الأقسام الرئيسية" value={stats.roots} helper="المستوى الأول من الكتالوج" icon={FolderTree} tone="blue" />
        <CategoryStatCard title="الأقسام الفرعية" value={stats.children} helper="مرتبطة بالأقسام الرئيسية" icon={Layers3} tone="coral" />
      </section>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[14px] py-[11px]">
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]">
              <Search className="h-[13px] w-[13px]" strokeWidth={1.8} />
            </div>

            <div>
              <p className="text-[10px] font-semibold text-[#444B55]">البحث والتصفية</p>
              <p className="mt-[2px] text-[7px] text-[#9BA2AC]">ابحث بالاسم أو الرابط وفلتر هيكل الفئات</p>
            </div>
          </div>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="flex h-[29px] items-center gap-[5px] rounded-[8px] px-[8px] text-[8px] font-semibold text-[#8A919B] transition-colors hover:bg-[#F5F7F9] hover:text-[#555D68]">
              <X className="h-[10px] w-[10px]" />
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[12px] lg:grid-cols-[minmax(0,1fr)_170px_170px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" strokeWidth={1.7} />

            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم الفئة، الاسم الإنجليزي أو slug..." className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] pl-[34px] text-[10px] font-medium shadow-none placeholder:text-[#A4ABB4] focus-visible:border-[#D7DBE5] focus-visible:bg-white focus-visible:ring-0" />

            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute left-[8px] top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center rounded-[7px] text-[#9AA1AB] transition-colors hover:bg-white hover:text-[#5C6470]">
                <X className="h-[11px] w-[11px]" />
              </button>
            )}
          </div>

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
            <SelectTrigger className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] px-[10px] text-[9px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">كل المستويات</SelectItem>
              <SelectItem value="root">رئيسية فقط</SelectItem>
              <SelectItem value="child">فرعية فقط</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] px-[10px] text-[9px] shadow-none focus:ring-0">
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

      {/* =====================================================
          MOBILE
      ===================================================== */}

      <section className="space-y-[8px] md:hidden">
        {filteredCategories.length === 0 ? (
          <CategoryEmpty />
        ) : (
          filteredCategories.map((category) => {
            const childrenCount = childrenCountMap.get(category.id) || 0;

            return (
              <article key={category.id} className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
                <div className="p-[11px]">
                  <div className="flex gap-[10px]">
                    <CategoryImage category={category} size="mobile" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-[7px]">
                        <div className="min-w-0">
                          <h3 className="truncate text-[11px] font-semibold text-[#3B424C]">{category.name_ar}</h3>
                          <p className="mt-[3px] truncate text-[7px] text-[#9299A3]">{category.name}</p>
                        </div>

                        <CategoryStatus active={Boolean(category.is_active)} />
                      </div>

                      <div className="mt-[8px] flex flex-wrap gap-[5px]">
                        <CategoryTypeBadge category={category} parentName={category.parent_id ? categoryNameById.get(category.parent_id) : undefined} />

                        {childrenCount > 0 && <span className="rounded-[6px] bg-[#EDF4FF] px-[6px] py-[3px] text-[6px] font-semibold text-[#567BC5]">{childrenCount} فرعي</span>}
                      </div>

                      <div className="mt-[8px] flex items-center justify-between text-[6.5px] text-[#9BA2AC]">
                        <span dir="ltr">{category.slug}</span>
                        <span>الترتيب #{category.sort_order ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_1fr_38px] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                  <button type="button" onClick={() => toggleActiveMutation.mutate({ id: category.id, is_active: !category.is_active })} className="flex h-[34px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[8px] font-semibold text-[#68717B]">
                    {category.is_active ? "تعطيل" : "تفعيل"}
                  </button>

                  <button type="button" onClick={() => handleEdit(category)} className="flex h-[34px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E3E7EC] bg-white text-[8px] font-semibold text-[#68717B]">
                    <Pencil className="h-[10px] w-[10px]" />
                    تعديل
                  </button>

                  <button type="button" onClick={() => setDeleteCategory(category)} className="flex h-[34px] w-[38px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56]">
                    <Trash2 className="h-[11px] w-[11px]" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* =====================================================
          DESKTOP
      ===================================================== */}

      <section className="hidden overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[14px] py-[11px]">
          <div>
            <div className="flex items-center gap-[7px]">
              <FolderTree className="h-[13px] w-[13px] text-[#675CBA]" strokeWidth={1.8} />
              <h2 className="text-[10px] font-semibold text-[#454C56]">هيكل الفئات</h2>
            </div>

            <p className="mt-[4px] text-[7px] text-[#9CA3AC]">{filteredCategories.length.toLocaleString("ar-EG")} نتيجة ظاهرة</p>
          </div>

          {isFetching && (
            <span className="flex items-center gap-[5px] text-[7px] text-[#969DA7]">
              <Loader2 className="h-[10px] w-[10px] animate-spin" />
              تحديث...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[7.5px] font-semibold text-[#9299A3]">
                <th className="w-[70px] px-[10px] text-right font-semibold">الصورة</th>
                <th className="px-[10px] text-right font-semibold">الفئة</th>
                <th className="px-[10px] text-right font-semibold">النوع</th>
                <th className="px-[10px] text-right font-semibold">الرابط</th>
                <th className="px-[10px] text-right font-semibold">الترتيب</th>
                <th className="px-[10px] text-right font-semibold">الحالة</th>
                <th className="w-[110px] px-[10px] text-center font-semibold">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <CategoryEmpty />
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => {
                  const childrenCount = childrenCountMap.get(category.id) || 0;

                  return (
                    <tr key={category.id} className="h-[67px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                      <td className="px-[10px]">
                        <CategoryImage category={category} size="desktop" />
                      </td>

                      <td className="px-[10px]">
                        <div className="min-w-[200px]">
                          <div className="flex items-center gap-[6px]">
                            <p className="max-w-[220px] truncate text-[10px] font-semibold text-[#414953]">{category.name_ar}</p>

                            {childrenCount > 0 && <span className="rounded-[5px] bg-[#EDF4FF] px-[5px] py-[2px] text-[5.8px] font-semibold text-[#567BC5]">{childrenCount}</span>}
                          </div>

                          <p className="mt-[4px] max-w-[220px] truncate text-[7px] text-[#9BA2AC]">{category.name}</p>
                        </div>
                      </td>

                      <td className="px-[10px]">
                        <CategoryTypeBadge category={category} parentName={category.parent_id ? categoryNameById.get(category.parent_id) : undefined} />
                      </td>

                      <td className="px-[10px]">
                        <span dir="ltr" className="block max-w-[180px] truncate text-right text-[7.5px] font-medium text-[#818994]">{category.slug}</span>
                      </td>

                      <td className="px-[10px]">
                        <span className="inline-flex h-[25px] min-w-[28px] items-center justify-center rounded-[7px] bg-[#F2F4F7] px-[7px] text-[7px] font-semibold text-[#727A84]">{category.sort_order ?? 0}</span>
                      </td>

                      <td className="px-[10px]">
                        <div className="flex items-center gap-[8px]">
                          <Switch checked={category.is_active ?? true} onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: category.id, is_active: checked })} />

                          <span className={cn("text-[7px] font-semibold", category.is_active ? "text-[#568468]" : "text-[#8B929C]")}>{category.is_active ? "نشط" : "معطل"}</span>
                        </div>
                      </td>

                      <td className="px-[10px]">
                        <div className="flex items-center justify-center gap-[4px]">
                          <button type="button" title="تعديل الفئة" onClick={() => handleEdit(category)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#707884] transition-colors hover:bg-[#F5F3FF] hover:text-[#675CBA]">
                            <Pencil className="h-[11px] w-[11px]" />
                          </button>

                          <button type="button" title="حذف الفئة" onClick={() => setDeleteCategory(category)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] transition-colors hover:bg-[#FFF3F1]">
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

      {/* =====================================================
          CREATE / EDIT DIALOG
      ===================================================== */}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeForm(); else setIsDialogOpen(true); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[720px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                {editingCategory ? <Pencil className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}
              </div>

              <div>
                <DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">{editingCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[8px] text-[#9299A3]">{editingCategory ? "حدّث معلومات الفئة وطريقة ظهورها في المتجر." : "أنشئ قسمًا جديدًا داخل كتالوج Flamingo Park."}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-[10px] p-[10px] lg:grid-cols-[minmax(0,1fr)_230px]">
              {/* FORM */}

              <div className="space-y-[10px]">
                <FormSection title="المعلومات الأساسية" icon={Folder}>
                  <div className="grid grid-cols-1 gap-[9px] sm:grid-cols-2">
                    <Field label="الاسم بالعربي" required>
                      <Input value={formData.name_ar} onChange={(event) => setFormData((current) => ({ ...current, name_ar: event.target.value }))} placeholder="مثال: ساعات" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" required />
                    </Field>

                    <Field label="الاسم بالإنجليزي" required>
                      <Input value={formData.name} onChange={(event) => { const name = event.target.value; setFormData((current) => ({ ...current, name, slug: editingCategory && current.slug ? current.slug : generateSlug(name) })); }} placeholder="Watches" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" required />
                    </Field>
                  </div>

                  <Field label="الرابط">
                    <Input value={formData.slug} onChange={(event) => setFormData((current) => ({ ...current, slug: generateSlug(event.target.value) }))} placeholder="watches" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>

                  <Field label="الوصف العربي">
                    <Textarea value={formData.description_ar} onChange={(event) => setFormData((current) => ({ ...current, description_ar: event.target.value }))} placeholder="وصف مختصر للفئة..." rows={3} className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] leading-5 shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>
                </FormSection>

                <FormSection title="الهيكل والتنظيم" icon={FolderTree}>
                  <div className="grid grid-cols-1 gap-[9px] sm:grid-cols-2">
                    <Field label="القسم الأب">
                      <Select value={formData.parent_id || "none"} onValueChange={(value) => setFormData((current) => ({ ...current, parent_id: value === "none" ? "" : value }))}>
                        <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="none">قسم رئيسي</SelectItem>

                          {parentOptions.map((category) => <SelectItem key={category.id} value={category.id}>{category.name_ar}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="الترتيب">
                      <Input type="number" min={0} value={formData.sort_order} onChange={(event) => setFormData((current) => ({ ...current, sort_order: Number.parseInt(event.target.value, 10) || 0 }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                    </Field>
                  </div>

                  <div className="flex items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] p-[10px]">
                    <div>
                      <p className="text-[8.5px] font-semibold text-[#555D67]">حالة الفئة</p>
                      <p className="mt-[2px] text-[6.5px] text-[#9BA2AC]">الفئة النشطة تظهر للعميل في المتجر.</p>
                    </div>

                    <div className="flex items-center gap-[7px]">
                      <span className={cn("text-[7px] font-semibold", formData.is_active ? "text-[#568468]" : "text-[#8C949E]")}>{formData.is_active ? "نشطة" : "معطلة"}</span>
                      <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData((current) => ({ ...current, is_active: checked }))} />
                    </div>
                  </div>
                </FormSection>
              </div>

              {/* IMAGE */}

              <div className="lg:sticky lg:top-[84px] lg:self-start">
                <FormSection title="صورة الفئة" icon={ImageIcon}>
                  {formData.image_url ? (
                    <div>
                      <div className="group relative aspect-square overflow-hidden rounded-[12px] border border-[#E3E7EC] bg-[#F3F5F7]">
                        <img src={formData.image_url} alt={formData.name_ar || "صورة الفئة"} className="h-full w-full object-cover" />

                        <button type="button" onClick={() => setFormData((current) => ({ ...current, image_url: "" }))} className="absolute left-[8px] top-[8px] flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-white/95 text-[#C15F56] shadow-sm backdrop-blur">
                          <Trash2 className="h-[11px] w-[11px]" />
                        </button>
                      </div>

                      <label className="mt-[7px] flex h-[34px] cursor-pointer items-center justify-center gap-[5px] rounded-[8px] border border-[#E2E6EB] bg-white text-[7.5px] font-semibold text-[#69717B] transition-colors hover:bg-[#F8FAFC]">
                        {uploading ? <Loader2 className="h-[10px] w-[10px] animate-spin" /> : <Upload className="h-[10px] w-[10px]" />}
                        تغيير الصورة
                        <input type="file" accept="image/*,.heic,.heif" className="hidden" disabled={uploading} onChange={handleUpload} />
                      </label>
                    </div>
                  ) : (
                    <label className={cn("flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed border-[#D9DEE5] bg-[#FAFBFC] transition-colors hover:border-[#BFB8DE] hover:bg-[#F9F8FF]", uploading && "pointer-events-none opacity-70")}>
                      {uploading ? (
                        <>
                          <Loader2 className="h-[20px] w-[20px] animate-spin text-[#675CBA]" />
                          <span className="mt-2 text-[7px] font-medium text-[#858D97]">جاري تحسين الصورة...</span>
                        </>
                      ) : (
                        <>
                          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                            <Upload className="h-[15px] w-[15px]" />
                          </div>

                          <span className="mt-[9px] text-[8px] font-semibold text-[#606873]">رفع صورة</span>
                          <span className="mt-[3px] text-center text-[6px] leading-4 text-[#A0A6AF]">JPG، PNG، WEBP أو HEIC<br />سيتم ضغطها تلقائيًا</span>
                        </>
                      )}

                      <input type="file" accept="image/*,.heic,.heif" className="hidden" disabled={uploading} onChange={handleUpload} />
                    </label>
                  )}

                  <div className="mt-[8px] rounded-[9px] bg-[#F8FAFC] p-[8px]">
                    <p className="text-[6px] leading-4 text-[#969DA7]">يفضل استخدام صورة مربعة وواضحة. سيتم تحويل الصورة تلقائيًا إلى WebP لتقليل حجم التحميل في المتجر.</p>
                  </div>
                </FormSection>
              </div>
            </div>

            {/* FOOTER */}

            <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-[#E5E9EF] bg-white/95 px-5 py-3 backdrop-blur">
              <p className="hidden text-[6.5px] text-[#A0A6AF] sm:block">{editingCategory ? "سيتم تطبيق التعديلات على الفئة الحالية." : "سيتم إضافة الفئة إلى كتالوج المتجر."}</p>

              <div className="mr-auto flex items-center gap-[7px]">
                <Button type="button" variant="outline" onClick={closeForm} disabled={saveMutation.isPending} className="h-[36px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[8px] font-semibold text-[#707883] shadow-none">إلغاء</Button>

                <Button type="submit" disabled={saveMutation.isPending || uploading} className="h-[36px] rounded-[9px] bg-[#675CBA] px-5 text-[8px] font-semibold text-white shadow-none hover:bg-[#594FAB]">
                  {saveMutation.isPending ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : editingCategory ? <Pencil className="ml-[5px] h-[11px] w-[11px]" /> : <Plus className="ml-[5px] h-[11px] w-[11px]" />}
                  {editingCategory ? "حفظ التعديلات" : "إضافة الفئة"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================
          DELETE DIALOG
      ===================================================== */}

      <AlertDialog open={Boolean(deleteCategory)} onOpenChange={(open) => { if (!open) setDeleteCategory(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[420px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader>
            <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]">
              <Trash2 className="h-[16px] w-[16px]" />
            </div>

            <AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">حذف الفئة</AlertDialogTitle>

            <AlertDialogDescription className="text-[10px] leading-6 text-[#858D97]">
              {deleteCategory && (childrenCountMap.get(deleteCategory.id) || 0) > 0 ? `الفئة "${deleteCategory.name_ar}" تحتوي على ${childrenCountMap.get(deleteCategory.id)} فئة فرعية. يجب نقل أو حذف الفئات الفرعية أولًا.` : `سيتم حذف الفئة "${deleteCategory?.name_ar || ""}" نهائيًا. لا يمكن التراجع عن هذه العملية.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[9px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel>

            <AlertDialogAction disabled={!deleteCategory || (childrenCountMap.get(deleteCategory.id) || 0) > 0 || deleteMutation.isPending} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[9px] font-semibold text-white hover:bg-[#B65555] disabled:opacity-40" onClick={(event) => {
              event.preventDefault();

              if (!deleteCategory) return;

              deleteMutation.mutate(deleteCategory);
            }}>
              {deleteMutation.isPending ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : <Trash2 className="ml-[5px] h-[12px] w-[12px]" />}
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =========================================================
   STAT CARD
========================================================= */

const CategoryStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: number; helper: string; icon: typeof Grid3X3; tone: "indigo" | "green" | "blue" | "coral" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <article className="relative min-h-[116px] overflow-hidden rounded-[15px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} />

      <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}>
        <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
      </div>

      <p className="mt-[12px] text-[8px] font-medium text-[#8D949E]">{title}</p>
      <p dir="ltr" className="mt-[4px] text-right text-[20px] font-semibold leading-none tracking-[-0.035em] text-[#303741]">{value.toLocaleString("en-US")}</p>
      <p className="mt-[5px] text-[6.5px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

/* =========================================================
   IMAGE
========================================================= */

const CategoryImage = ({ category, size }: { category: Category; size: "mobile" | "desktop" }) => {
  const boxClass = size === "mobile" ? "h-[68px] w-[68px] rounded-[11px]" : "h-[48px] w-[48px] rounded-[9px]";

  if (!category.image_url) {
    return (
      <div className={cn("flex shrink-0 items-center justify-center border border-[#E8EBEF] bg-[#F3F5F7] text-[#969EA8]", boxClass)}>
        <Grid3X3 className="h-[15px] w-[15px]" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={cn("shrink-0 overflow-hidden border border-[#E8EBEF] bg-[#F3F5F7]", boxClass)}>
      <img src={category.image_url} loading="lazy" decoding="async" alt={category.name_ar} className="h-full w-full object-cover" />
    </div>
  );
};

/* =========================================================
   STATUS
========================================================= */

const CategoryStatus = ({ active }: { active: boolean }) => {
  return (
    <span className={cn("inline-flex h-[24px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[6.5px] font-semibold", active ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]")}>
      <span className={cn("h-[5px] w-[5px] rounded-full", active ? "bg-[#629067]" : "bg-[#969EA8]")} />
      {active ? "نشط" : "معطل"}
    </span>
  );
};

/* =========================================================
   TYPE
========================================================= */

const CategoryTypeBadge = ({ category, parentName }: { category: Category; parentName?: string }) => {
  if (!category.parent_id) {
    return (
      <span className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#E0DCF1] bg-[#F5F3FC] px-[7px] text-[6.5px] font-semibold text-[#6D64A5]">
        <FolderTree className="h-[8px] w-[8px]" />
        رئيسي
      </span>
    );
  }

  return (
    <span className="inline-flex h-[25px] max-w-[170px] items-center gap-[5px] rounded-[7px] border border-[#DCE7F4] bg-[#F1F6FC] px-[7px] text-[6.5px] font-semibold text-[#5679A4]">
      <Layers3 className="h-[8px] w-[8px] shrink-0" />
      <span className="truncate">{parentName || "فرعي"}</span>
    </span>
  );
};

/* =========================================================
   FORM HELPERS
========================================================= */

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: typeof Folder; children: React.ReactNode }) => {
  return (
    <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]">
      <div className="mb-[11px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[9px]">
        <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]">
          <Icon className="h-[11px] w-[11px]" />
        </div>

        <h3 className="text-[9px] font-semibold text-[#4A525C]">{title}</h3>
      </div>

      <div className="space-y-[9px]">{children}</div>
    </section>
  );
};

const Field = ({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) => {
  return (
    <div>
      <Label className="mb-[6px] block text-[7.5px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>
      {children}
    </div>
  );
};

/* =========================================================
   EMPTY
========================================================= */

const CategoryEmpty = () => {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]">
        <Grid3X3 className="h-[18px] w-[18px]" />
      </div>

      <h3 className="mt-3 text-[10px] font-semibold text-[#535B65]">لا توجد فئات</h3>
      <p className="mt-[4px] text-[7px] text-[#9BA2AC]">لم نجد أي فئة مطابقة للبحث والفلاتر الحالية.</p>
    </div>
  );
};

export default AdminCategoriesPage;