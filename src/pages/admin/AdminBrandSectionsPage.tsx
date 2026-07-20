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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Upload, ArrowRight, Package } from "lucide-react";

interface Section {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface BrandOpt { id: string; name: string; }

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^\w\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");

const AdminBrandSectionsPage = () => {
  const { id: routeBrandId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(routeBrandId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", image_url: "", description: "", sort_order: 0, is_active: true });
  const [uploading, setUploading] = useState(false);

  const { data: brands = [] } = useQuery({
    queryKey: ["all-brands-for-sections"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brands").select("id,name").order("sort_order");
      if (error) throw error;
      return (data || []) as BrandOpt[];
    },
  });

  const activeBrandId = selectedBrandId || brands[0]?.id;

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["brand-sections-admin", activeBrandId],
    enabled: !!activeBrandId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brand_sections").select("*").eq("brand_id", activeBrandId).order("sort_order");
      if (error) throw error;
      return (data || []) as Section[];
    },
  });

  const resetForm = () => {
    setForm({ name: "", slug: "", image_url: "", description: "", sort_order: 0, is_active: true });
    setEditing(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (s: Section) => {
    setEditing(s);
    setForm({ name: s.name, slug: s.slug, image_url: s.image_url || "", description: s.description || "", sort_order: s.sort_order, is_active: s.is_active });
    setDialogOpen(true);
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `brands/section-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
    } catch (e: any) {
      toast({ title: "فشل الرفع", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!activeBrandId) throw new Error("اختر ماركة أولاً");
      if (!form.name) throw new Error("اسم القسم مطلوب");
      const payload = {
        brand_id: activeBrandId,
        name: form.name.trim(),
        slug: (form.slug || slugify(form.name)).trim(),
        image_url: form.image_url || null,
        description: form.description || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await (supabase as any).from("brand_sections").update(payload).eq("id", editing.id);
        if (error) throw error;
            } else {
        const { error } = await (supabase as any)
          .from("brand_sections")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-sections-admin", activeBrandId] });
      toast({ title: editing ? "تم التحديث" : "تمت الإضافة" });
      setDialogOpen(false); resetForm();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("brand_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-sections-admin", activeBrandId] });
      toast({ title: "تم الحذف" });
    },
  });

  return (
  <div className="min-h-screen max-w-[1500px] mx-auto px-4 md:px-6 py-8 space-y-8" dir="rtl">
    <AdminPageHeader
      category="الماركات"
      title="أقسام الماركة"
      description={`${sections.length} قسم`}
      actions={[
        { label:"رجوع", icon:ArrowRight, onClick:()=>navigate("/admin/brand-pages"), variant:"secondary" },
        { label:"إضافة قسم", icon:Plus, onClick:openNew, variant:"primary" },
      ]}
    />

    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h3 className="font-heading text-lg font-semibold">إدارة أقسام الماركة</h3>
        <p className="text-sm text-muted-foreground mt-1">اختر الماركة لإدارة أقسامها ومنتجاتها</p>
      </div>

      <select
        className="h-12 md:w-72 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        value={activeBrandId || ""}
        onChange={(e)=>setSelectedBrandId(e.target.value)}
      >
        {brands.map((b)=>(
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>

    {isLoading ? (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1,2,3].map((i)=>(
          <div key={i} className="bg-card border border-border rounded-3xl overflow-hidden animate-pulse">
            <div className="h-56 bg-muted"/>
            <div className="p-5 space-y-3">
              <div className="h-5 bg-muted rounded"/>
              <div className="h-4 bg-muted rounded w-2/3"/>
              <div className="h-10 bg-muted rounded-xl"/>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {sections.map((s)=>(
          <div key={s.id} className="group bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">

            <div className="relative h-56 bg-muted overflow-hidden">
              {s.image_url ? (
                <img src={s.image_url} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Package className="w-12 h-12 opacity-30"/>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent"/>

              <span className={`absolute top-4 left-4 text-xs px-3 py-1.5 rounded-full backdrop-blur-md font-medium ${s.is_active ? "bg-green-500/20 text-green-700 border border-green-500/30" : "bg-red-500/20 text-red-700 border border-red-500/30"}`}>
                {s.is_active ? "نشط" : "معطل"}
              </span>
            </div>

            <div className="p-5 space-y-5">

              <div>
                <h3 className="font-heading text-xl font-semibold">
                  {s.name}
                </h3>

                <p className="text-xs text-muted-foreground mt-2">
                  /{s.slug} • ترتيب {s.sort_order}
                </p>

                {s.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {s.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl hover:border-pink-300 hover:text-pink-600"
                  onClick={()=>openEdit(s)}
                >
                  <Pencil className="w-4 h-4 ml-1"/>
                  تعديل
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl hover:border-pink-300 hover:text-pink-600"
                  onClick={()=>navigate(`/admin/brand-sections/${s.id}/products`)}
                >
                  <Package className="w-4 h-4 ml-1"/>
                  المنتجات
                </Button>

                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-xl text-destructive hover:bg-destructive/10"
                  onClick={()=>{
                    if(confirm("حذف هذا القسم؟")){
                      del.mutate(s.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4"/>
                </Button>
              </div>

            </div>
          </div>
        ))}

        {sections.length===0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="w-14 h-14 opacity-40 mb-4"/>
            <h3 className="text-lg font-semibold text-foreground">
              لا توجد أقسام
            </h3>
            <p className="text-sm mt-2">
              أضف أول قسم لهذه الماركة للبدء
            </p>
          </div>
        )}
      </div>
    )}

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-xl rounded-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {editing ? "تعديل القسم" : "إضافة قسم جديد"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          <div className="space-y-2">
            <Label>اسم القسم *</Label>
            <Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="h-12 rounded-xl"/>
          </div>

          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={form.slug} placeholder={slugify(form.name)} onChange={(e)=>setForm({...form,slug:e.target.value})} className="h-12 rounded-xl"/>
          </div>

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea rows={4} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="rounded-xl"/>
          </div>

          <div className="space-y-3">
            <Label>الصورة</Label>

            {form.image_url && (
              <img src={form.image_url} alt="" className="w-full h-48 object-cover rounded-2xl"/>
            )}

            <label className="h-12 rounded-xl border border-border flex items-center justify-center gap-2 cursor-pointer hover:border-pink-400 transition">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Upload className="w-5 h-5"/>}
              {uploading ? "جاري الرفع..." : "رفع صورة"}

              <input type="file" accept="image/*" className="hidden" onChange={(e)=>e.target.files?.[0] && upload(e.target.files[0])}/>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الترتيب</Label>
              <Input type="number" value={form.sort_order} onChange={(e)=>setForm({...form,sort_order:Number(e.target.value)})}/>
            </div>

            <div className="flex items-center gap-3 pt-8">
              <Switch checked={form.is_active} onCheckedChange={(v)=>setForm({...form,is_active:v})}/>
              <Label>نشط</Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button className="flex-1 h-12 rounded-xl" onClick={()=>save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2"/>}
              حفظ
            </Button>

            <Button variant="outline" className="h-12 rounded-xl" onClick={()=>setDialogOpen(false)}>
              إلغاء
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>

  </div>
);
};

export default AdminBrandSectionsPage;