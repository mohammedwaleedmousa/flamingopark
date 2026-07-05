import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, Grid3X3, Search, Loader2, X, ZoomIn, Move } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

interface Category {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  image_url: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  countries: string[] | null;
}

const AdminCategoriesPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    slug: "",
    image_url: "",
    is_active: true,
    sort_order: 0,
    countries: ["SA", "YE"] as string[],
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

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `categories/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("uploads").upload(fileName, file);

    if (uploadError) {
      toast({ title: "خطأ في رفع الصورة", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(fileName);

    setFormData({ ...formData, image_url: urlData.publicUrl });
    setUploading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_ar: "",
      slug: "",
      image_url: "",
      is_active: true,
      sort_order: 0,
      countries: ["SA", "YE"],
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
      image_url: category.image_url || "",
      is_active: category.is_active ?? true,
      sort_order: category.sort_order ?? 0,
      countries: category.countries || ["SA", "YE"],
      image_zoom: 1,
      image_position_x: 50,
      image_position_y: 50,
    });
    setIsDialogOpen(true);
  };

  const toggleCountry = (country: string) => {
    setFormData((prev) => ({
      ...prev,
      countries: prev.countries.includes(country)
        ? prev.countries.filter((c) => c !== country)
        : [...prev.countries, country],
    }));
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
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      {/* Header */}
      <AdminPageHeader
        category="الكتالوج"
        title="الفئات"
        description={`${stats.total} فئة • ${stats.active} نشطة`}
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
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "الكل", value: stats.total, color: "from-primary/20 to-primary/10 border-primary/20" },
          { label: "نشطة", value: stats.active, color: "from-green-500/20 to-green-500/10 border-green-500/20" },
          { label: "معطلة", value: stats.inactive, color: "from-red-500/20 to-red-500/10 border-red-500/20" },
        ].map((stat) => (
          <div key={stat.label} className={cn("p-4 rounded-xl text-center border bg-gradient-to-br", stat.color)}>
            <p className="text-2xl font-heading">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن فئة..."
          className="pr-10 bg-card"
          dir="rtl"
        />
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredCategories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-4">
              {category.image_url ? (
                <img
                  src={category.image_url}
                  alt={category.name_ar}
                  className="w-16 h-16 object-cover bg-muted rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                  <Grid3X3 className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading text-foreground truncate">{category.name_ar}</h3>
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium shrink-0 border",
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
                  <span>الترتيب: {category.sort_order}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => toggleActiveMutation.mutate({ id: category.id, is_active: !category.is_active })}
              >
                {category.is_active ? "تعطيل" : "تفعيل"}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => handleEdit(category)}>
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
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-right p-4 font-heading text-sm">الصورة</th>
              <th className="text-right p-4 font-heading text-sm">الاسم (عربي)</th>
              <th className="text-right p-4 font-heading text-sm">الاسم (إنجليزي)</th>
              <th className="text-right p-4 font-heading text-sm">البلدان</th>
              <th className="text-right p-4 font-heading text-sm">الترتيب</th>
              <th className="text-right p-4 font-heading text-sm">الحالة</th>
              <th className="text-right p-4 font-heading text-sm">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map((category) => (
              <tr key={category.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name_ar}
                      className="h-12 w-12 object-cover bg-muted rounded-lg"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                      <Grid3X3 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </td>
                <td className="p-4 font-heading">{category.name_ar}</td>
                <td className="p-4 text-muted-foreground">{category.name}</td>
                <td className="p-4">
                  <div className="flex gap-1">
                    {category.countries?.includes('SA') && (
                      <span className="px-2 py-0.5 text-xs rounded bg-green-500/15 text-green-600 border border-green-500/30">SA</span>
                    )}
                    {category.countries?.includes('YE') && (
                      <span className="px-2 py-0.5 text-xs rounded bg-blue-500/15 text-blue-600 border border-blue-500/30">YE</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">{category.sort_order}</td>
                <td className="p-4">
                  <Switch
                    checked={category.is_active ?? true}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: category.id, is_active: checked })}
                  />
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="hover:bg-muted" onClick={() => handleEdit(category)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
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

                {/* Countries Selection */}
                <div className="space-y-2">
                  <Label>الدول</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.countries.includes("SA")}
                        onCheckedChange={() => toggleCountry("SA")}
                      />
                      <span className="text-sm">🇸🇦 السعودية</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.countries.includes("YE")}
                        onCheckedChange={() => toggleCountry("YE")}
                      />
                      <span className="text-sm">🇾🇪 اليمن</span>
                    </label>
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
