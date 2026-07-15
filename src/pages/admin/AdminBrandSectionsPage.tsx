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
import { Plus, Pencil, Trash2, Loader2, Upload, ArrowRight } from "lucide-react";

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
        const { error } = await (supabase as any).from("brand_sections").insert(payload);
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
    <div className="space-y-6 max-w-[1200px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="الماركات"
        title="أقسام الماركة"
        description={`${sections.length} قسم`}
        actions={[
          { label: "رجوع", icon: ArrowRight, onClick: () => navigate("/admin/brand-pages"), variant: "secondary" },
          { label: "إضافة قسم", icon: Plus, onClick: openNew, variant: "primary" },
        ]}
      />

      <div className="flex items-center gap-3">
        <Label>الماركة:</Label>
        <select
          className="border rounded px-3 py-2 bg-card"
          value={activeBrandId || ""}
          onChange={(e) => setSelectedBrandId(e.target.value)}
        >
          {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="aspect-video bg-muted">
                {s.image_url ? <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" /> : null}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading">{s.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${s.is_active ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"}`}>
                    {s.is_active ? "نشط" : "معطل"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">/{s.slug} · ترتيب {s.sort_order}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(s)}>
                    <Pencil className="w-4 h-4 ml-1" /> تعديل
                  </Button>
                  <Button size="icon" variant="outline" className="text-destructive" onClick={() => { if (confirm("حذف هذا القسم؟")) del.mutate(s.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {sections.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">لا توجد أقسام لهذه الماركة</div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل قسم" : "قسم جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} placeholder={slugify(form.name)} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div className="space-y-2"><Label>الوصف</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>الصورة</Label>
              {form.image_url && <img src={form.image_url} alt="" className="h-24 w-full object-cover rounded" />}
              <label className="inline-flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-muted text-sm">
                <Upload className="w-4 h-4" /> {uploading ? "جاري الرفع..." : "رفع"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>الترتيب</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>نشط</Label></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1">
                {save.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}حفظ
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBrandSectionsPage;