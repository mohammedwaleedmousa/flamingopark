import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, Grid3X3, Search, Loader2, X, ZoomIn, Move } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import imageCompression from "browser-image-compression";

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
}

const AdminCategoriesPage = () => {
  const SINGLE_COUNTRY = "GLOBAL";
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    slug: "",
    parent_id: "",
    image_url: "",
    is_active: true,
    sort_order: 0,
    countries: [SINGLE_COUNTRY] as string[],
    image_zoom: 1,
    image_position_x: 50,
    image_position_y: 50,
  });
  const [uploading, setUploading] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, "-");
      console.log("Saving category:", data);

      if (data.id) {
        const { data: result, error } = await supabase
          .from("categories")
          .update({
            name: data.name,
            name_ar: data.name_ar,
            slug,
            image_url: data.image_url || null,
            parent_id: data.parent_id || null,
            is_active: data.is_active,
            sort_order: data.sort_order,
            countries: data.countries,
          })
          .eq("id", data.id)
          .select();

        console.log("Update result:", result, "Error:", error);
        if (error) throw error;
      } else {
        const { data: result, error } = await supabase
          .from("categories")
          .insert({
            name: data.name,
            name_ar: data.name_ar,
            slug,
            image_url: data.image_url || null,
            parent_id: data.parent_id || null,
            is_active: data.is_active,
            sort_order: data.sort_order,
            countries: data.countries,
          })
          .select();

        console.log("Insert result:", result, "Error:", error);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: editingCategory ? "تم تحديث الفئة" : "تم إضافة الفئة" });
      resetForm();
    },
    onError: (error: any) => {
      console.error("Category save error:", error);
      toast({ title: "حدث خطأ", description: error?.message || "فشل في حفظ الفئة", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "تم حذف الفئة" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];

  if (!file) return;

  try {
    setUploading(true);

    const compressedFile = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: "image/webp",
    });


    const fileName = `categories/${Date.now()}.webp`;


    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, compressedFile, {
        contentType: "image/webp",
      });


    if (uploadError) {
      throw uploadError;
    }


    const { data } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);


    setFormData((prev) => ({
      ...prev,
      image_url: data.publicUrl,
    }));


    toast({
      title: "تم رفع الصورة بنجاح",
    });


  } catch (error) {

    console.error(error);

    toast({
      title: "فشل رفع الصورة",
      variant: "destructive",
    });

  } finally {

    setUploading(false);

  }
};

  const resetForm = () => {
    setFormData({
      name: "",
      name_ar: "",
      slug: "",
      parent_id: "",
      image_url: "",
      is_active: true,
      sort_order: 0,
      countries: [SINGLE_COUNTRY],
      image_zoom: 1,
      image_position_x: 50,
      image_position_y: 50,
    });
    setEditingCategory(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      name_ar: category.name_ar,
      slug: category.slug,
      parent_id: category.parent_id || "",
      image_url: category.image_url || "",
      is_active: category.is_active ?? true,
      sort_order: category.sort_order ?? 0,
      countries: category.countries || [SINGLE_COUNTRY],
      image_zoom: 1,
      image_position_x: 50,
      image_position_y: 50,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingCategory?.id,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  const filteredCategories =
    categories?.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.name_ar.includes(search)) || [];

  const categoryNameById = new Map((categories || []).map((c) => [c.id, c.name_ar]));

  const parentOptions = (categories || []).filter((c) => c.id !== editingCategory?.id);

  const stats = {
    total: categories?.length || 0,
    active: categories?.filter((c) => c.is_active).length || 0,
    inactive: categories?.filter((c) => !c.is_active).length || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-[1500px] mx-auto px-3 md:px-6 py-6 space-y-8" dir="rtl">
      {/* Header */}
      <AdminPageHeader
        category="الكتالوج"
        title="إدارة الفئات"
        description={`إجمالي ${stats.total} فئة • ${stats.active} نشطة حالياً`}
        actions={[
          {
            label: "إضافة فئة",
            icon: Plus,
            onClick: () => {
              resetForm();
              setIsDialogOpen(true);
            },
            variant: "primary",
          },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          {
            label: "إجمالي الفئات",
            value: stats.total,
            style: "from-pink-500/20 to-pink-500/5",
          },
          {
            label: "الفئات النشطة",
            value: stats.active,
            style: "from-green-500/20 to-green-500/5",
          },
          {
            label: "الفئات المعطلة",
            value: stats.inactive,
            style: "from-red-500/20 to-red-500/5",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.style} border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition`}
          >
            <p className="text-3xl font-heading">
              {stat.value}
            </p>

            <p className="text-sm text-muted-foreground mt-2">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative bg-card border border-border rounded-2xl shadow-sm">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن فئة..."
          className="h-14 pr-12 bg-transparent border-0 focus-visible:ring-0 text-base"
          dir="rtl"
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredCategories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-5">
              {category.image_url ? (
                <img
                  src={`${category.image_url}?v=${Date.now()}`}
                  alt={category.name_ar}
                  className="w-20 h-20 object-cover rounded-2xl shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center">
                  <Grid3X3 className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading text-lg text-foreground truncate">{category.name_ar}</h3>
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium shrink-0 border",
                      category.is_active
                        ? "bg-green-500/15 text-green-600 border-green-500/30"
                        : "bg-red-500/15 text-red-600 border-red-500/30",
                    )}
                  >
                    {category.is_active ? "نشط" : "معطل"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{category.name}</p>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{category.parent_id ? `فرعي تحت: ${categoryNameById.get(category.parent_id) || "-"}` : "قسم رئيسي"}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>الترتيب: {category.sort_order}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-5 pt-5 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-10 rounded-xl"
                onClick={() => toggleActiveMutation.mutate({ id: category.id, is_active: !category.is_active })}
              >
                {category.is_active ? "تعطيل" : "تفعيل"}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-10 rounded-xl gap-2" onClick={() => handleEdit(category)}>
                <Pencil className="w-4 h-4" />
                تعديل
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => {
                  if (confirm("هل أنت متأكد من حذف هذه الفئة؟")) {
                    deleteMutation.mutate(category.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
        {filteredCategories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد فئات</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-right px-5 py-4 font-heading text-xs text-muted-foreground uppercase">الصورة</th>
              <th className="text-right px-5 py-4 font-heading text-xs text-muted-foreground uppercase">الاسم (عربي)</th>
              <th className="text-right px-5 py-4 font-heading text-xs text-muted-foreground uppercase">الاسم (إنجليزي)</th>
              <th className="text-right px-5 py-4 font-heading text-xs text-muted-foreground uppercase">النوع</th>
              <th className="text-right px-5 py-4 font-heading text-xs text-muted-foreground uppercase">الترتيب</th>
              <th className="text-right px-5 py-4 font-heading text-xs text-muted-foreground uppercase">الحالة</th>
              <th className="text-right px-5 py-4 font-heading text-xs text-muted-foreground uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map((category) => (
              <tr key={category.id} className="border-b border-border hover:bg-muted/40 transition">
                <td className="p-4">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name_ar}
                      className="h-14 w-14 object-cover rounded-xl shadow-sm"
                    />
                  ) : (
                    <div className="h-14 w-14 bg-muted rounded-xl flex items-center justify-center">
                      <Grid3X3 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 font-heading text-base">{category.name_ar}</td>
                <td className="px-5 py-4 text-muted-foreground text-sm">{category.name}</td>
                <td className="px-5 py-4 text-muted-foreground text-sm">
                  {category.parent_id ? `فرعي (${categoryNameById.get(category.parent_id) || "-"})` : "رئيسي"}
                </td>
                <td className="px-5 py-4 text-muted-foreground text-sm">{category.sort_order}</td>
                <td className="p-4">
                  <Switch
                    checked={category.is_active ?? true}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: category.id, is_active: checked })}
                  />
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="rounded-xl hover:bg-muted" onClick={() => handleEdit(category)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive rounded-xl hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذه الفئة؟")) {
                          deleteMutation.mutate(category.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCategories.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted-foreground">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد فئات</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Dialog */}
      <AnimatePresence>
        {isDialogOpen && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">
                  {editingCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم بالعربي</Label>
                  <Input
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    placeholder="مثال: ساعات"
                    dir="rtl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>الاسم بالإنجليزي</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        ...formData,
                        name,
                        slug: generateSlug(name),
                      });
                    }}
                    placeholder="Example: Watches"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>الرابط (Slug)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="watches"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label>القسم الأب (اختياري)</Label>
                  <Select
                    value={formData.parent_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="قسم رئيسي (بدون أب)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">قسم رئيسي (بدون أب)</SelectItem>
                      {parentOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الصورة</Label>
                  <div className="flex flex-col gap-3">
                    {formData.image_url ? (
                      <div className="space-y-4">
                        {/* Image Preview with positioning */}
                        <div
                          className="relative border border-border rounded overflow-hidden"
                          style={{ height: "150px" }}
                        >
                          <img
                            src={formData.image_url}
                            alt="Preview"
                            className="w-full h-full"
                            style={{
                              objectFit: "cover",
                              transform: `scale(${formData.image_zoom})`,
                              objectPosition: `${formData.image_position_x}% ${formData.image_position_y}%`,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, image_url: "" })}
                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Image Controls */}
                        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                          {/* Zoom */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <ZoomIn className="w-4 h-4 text-muted-foreground" />
                              <label className="text-xs text-muted-foreground">
                                التكبير: {formData.image_zoom.toFixed(1)}x
                              </label>
                            </div>
                            <Slider
                              value={[formData.image_zoom]}
                              onValueChange={([v]) => setFormData({ ...formData, image_zoom: v })}
                              min={1}
                              max={2}
                              step={0.1}
                              className="w-full"
                            />
                          </div>

                          {/* Position X */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Move className="w-4 h-4 text-muted-foreground" />
                              <label className="text-xs text-muted-foreground">
                                الموضع الأفقي: {formData.image_position_x}%
                              </label>
                            </div>
                            <Slider
                              value={[formData.image_position_x]}
                              onValueChange={([v]) => setFormData({ ...formData, image_position_x: v })}
                              min={0}
                              max={100}
                              step={1}
                              className="w-full"
                            />
                          </div>

                          {/* Position Y */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Move className="w-4 h-4 text-muted-foreground rotate-90" />
                              <label className="text-xs text-muted-foreground">
                                الموضع العمودي: {formData.image_position_y}%
                              </label>
                            </div>
                            <Slider
                              value={[formData.image_position_y]}
                              onValueChange={([v]) => setFormData({ ...formData, image_position_y: v })}
                              min={0}
                              max={100}
                              step={1}
                              className="w-full"
                            />
                          </div>

                          {/* Reset Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFormData({ ...formData, image_zoom: 1, image_position_x: 50, image_position_y: 50 })
                            }
                          >
                            إعادة تعيين الموضع
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                        <div className="h-24 w-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center hover:border-gold transition-colors">
                          {uploading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                              <span className="text-xs text-muted-foreground">رفع صورة</span>
                            </>
                          )}
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>الترتيب</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>نشط</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 btn-gold" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCategoriesPage;
