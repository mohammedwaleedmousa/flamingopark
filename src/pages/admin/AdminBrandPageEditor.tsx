import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, ArrowRight } from "lucide-react";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");

const AdminBrandPageEditor = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const isNewRoute = !routeId || routeId === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(
    isNewRoute ? null : routeId!
  );
  const editingId = selectedBrandId || (isNewRoute ? null : routeId!);
  const isNew = !editingId;

  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo_url: "",
    hero_image: "",
    description: "",
    is_active: true,
    sort_order: 0,
  });
  const [uploading, setUploading] = useState<"logo" | "hero" | null>(null);

  // كل الماركات ليختار الأدمن منها عند إنشاء صفحة جديدة
  const { data: allBrands = [] } = useQuery({
    queryKey: ["all-brands-picker"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brands")
        .select("id,name,slug,logo_url,hero_image,description,is_active,sort_order")
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { isLoading } = useQuery({
    queryKey: ["admin-brand-edit", editingId],
    enabled: !!editingId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brands")
        .select("*")
        .eq("id", editingId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setForm({
          name: data.name || "",
          slug: data.slug || "",
          logo_url: data.logo_url || "",
          hero_image: data.hero_image || "",
          description: data.description || "",
          is_active: data.is_active ?? true,
          sort_order: data.sort_order ?? 0,
        });
      }
      return data;
    },
  });

  const pickExistingBrand = (brandId: string) => {
    setSelectedBrandId(brandId);
  };

  const upload = async (file: File, kind: "logo" | "hero") => {
    setUploading(kind);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `brands/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("uploads")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type || undefined });
      if (error) {
        console.error("[brand upload]", error);
        throw error;
      }
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      setForm((f) => ({ ...f, [kind === "logo" ? "logo_url" : "hero_image"]: data.publicUrl }));
      toast({ title: "تم رفع الصورة" });
    } catch (e: any) {
      toast({
        title: "فشل رفع الصورة",
        description: e?.message || "تأكد من تسجيل الدخول كأدمن ثم أعد المحاولة",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        slug: (form.slug || slugify(form.name)).trim(),
        logo_url: form.logo_url || null,
        hero_image: form.hero_image || null,
        description: form.description || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (!payload.name) throw new Error("اسم الماركة مطلوب");
      if (editingId) {
        const { error } = await (supabase as any).from("brands").update(payload).eq("id", editingId);
        if (error) throw error;
        return { id: editingId };
      } else {
        const { data, error } = await (supabase as any).from("brands").insert(payload).select().single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-brand-pages"] });
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      toast({ title: "تم الحفظ" });
      if (data?.id && isNewRoute) navigate(`/admin/brand-pages/${data.id}`);
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto" dir="rtl">
      <AdminPageHeader
        category="الماركات"
        title={isNew ? "إضافة صفحة ماركة" : `تعديل صفحة ${form.name || "الماركة"}`}
        actions={[{ label: "رجوع", icon: ArrowRight, onClick: () => navigate("/admin/brand-pages"), variant: "secondary" }]}
      />

      {isNew && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <Label>اختر الماركة *</Label>
            <Select onValueChange={pickExistingBrand}>
              <SelectTrigger>
                <SelectValue placeholder="اختر ماركة من القائمة..." />
              </SelectTrigger>
              <SelectContent>
                {allBrands.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              اختر ماركة موجودة لإدارة صفحتها (شعار، صورة، وصف، أقسام). لإضافة ماركة جديدة بالكامل، انتقل إلى صفحة الماركات.
            </p>
          </div>
        </div>
      )}

      {!isNew && (
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>اسم الماركة *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Slug (الرابط)</Label>
            <Input
              value={form.slug}
              placeholder={slugify(form.name)}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>الوصف</Label>
          <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>شعار الماركة (Logo)</Label>
            {form.logo_url && (
              <img src={form.logo_url} alt="" className="h-20 object-contain bg-muted rounded p-2" />
            )}
            <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-muted">
              <Upload className="w-4 h-4" />
              {uploading === "logo" ? "جاري الرفع..." : "رفع شعار"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo")} />
            </label>
          </div>
          <div className="space-y-2">
            <Label>صورة الهيرو (Hero)</Label>
            {form.hero_image && (
              <img src={form.hero_image} alt="" className="h-20 object-cover w-full rounded" />
            )}
            <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-muted">
              <Upload className="w-4 h-4" />
              {uploading === "hero" ? "جاري الرفع..." : "رفع صورة الهيرو"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "hero")} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>الترتيب</Label>
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3 pt-8">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>نشطة</Label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            حفظ
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/brand-pages")}>إلغاء</Button>
        </div>
      </div>
      )}
    </div>
  );
};

export default AdminBrandPageEditor;