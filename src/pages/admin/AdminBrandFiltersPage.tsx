import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Filter {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  filter_type: string;
  options: string[];
  sort_order: number;
  is_active: boolean;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\w\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");

const AdminBrandFiltersPage = () => {
  const { id: routeBrandId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(routeBrandId);
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Filter | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    filter_type: "multi",
    optionsText: "",
    sort_order: 0,
    is_active: true,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["all-brands-filters"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brands").select("id,name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const activeBrandId = selectedBrandId || brands[0]?.id;
  const { data: sections = [] } = useQuery({
    queryKey: ["brand-sections-filters", activeBrandId],
    enabled: !!activeBrandId && !!selectedSectionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brand_sections")
        .select("id,name")
        .eq("brand_id", activeBrandId)
        .eq("section_id", selectedSectionId)
        .order("sort_order");

      if (error) throw error;

      return data || [];
    },
  });

  const { data: filters = [], isLoading } = useQuery({
    queryKey: ["brand-filters-admin", activeBrandId],
    enabled: !!activeBrandId && !!selectedSectionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brand_filters")
        .select("*")
        .eq("brand_id", activeBrandId)
        .eq("section_id", selectedSectionId)
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((f: any) => ({ ...f, options: Array.isArray(f.options) ? f.options : [] })) as Filter[];
    },
  });

  const resetForm = () => {
    setForm({ name: "", slug: "", filter_type: "multi", optionsText: "", sort_order: 0, is_active: true });
    setEditing(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (f: Filter) => {
    setEditing(f);
    setForm({
      name: f.name,
      slug: f.slug,
      filter_type: f.filter_type || "multi",
      optionsText: (f.options || []).join("\n"),
      sort_order: f.sort_order,
      is_active: f.is_active,
    });
    setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!activeBrandId) throw new Error("اختر ماركة أولاً");
      if (!selectedSectionId) throw new Error("اختر القسم أولاً");
      if (!form.name.trim()) throw new Error("اسم الفلتر مطلوب");
      const options = form.optionsText.split("\n").map((s) => s.trim()).filter(Boolean);
      const payload = {
        brand_id: activeBrandId,
        section_id: selectedSectionId,
        name: form.name.trim(),
        slug: (form.slug || slugify(form.name)).trim(),
        filter_type: form.filter_type,
        options,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await (supabase as any).from("brand_filters").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("brand_filters").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-filters-admin", activeBrandId] });
      toast({ title: editing ? "تم التحديث" : "تمت الإضافة" });
      setDialogOpen(false); resetForm();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("brand_filters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["brand-filters-admin", activeBrandId] });
      toast({ title: "تم الحذف" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="الماركات"
        title="فلاتر الماركة"
        description={`${filters.length} فلتر`}
        actions={[
          { label: "رجوع", icon: ArrowRight, onClick: () => navigate("/admin/brand-pages"), variant: "secondary" },
          { label: "إضافة فلتر", icon: Plus, onClick: openNew, variant: "primary" },
        ]}
      />

      <div className="flex items-center gap-3">
        <Label>الماركة:</Label>
        <Select value={activeBrandId || ""} onValueChange={(value) => {setSelectedBrandId(value);setSelectedSectionId(undefined);}}>
          <SelectTrigger className="w-64"><SelectValue placeholder="اختر ماركة" /></SelectTrigger>
          <SelectContent>
            {brands.map((b: any) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Label>القسم:</Label>

        <Select
          value={selectedSectionId || ""}
          onValueChange={setSelectedSectionId}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="اختر القسم" />
          </SelectTrigger>

          <SelectContent>
            {sections.map((section: any) => (
              <SelectItem
                key={section.id}
                value={section.id}
              >
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filters.map((f) => (
            <div key={f.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading">{f.name}</h3>
                  <p className="text-xs text-muted-foreground">/{f.slug} · نوع: {f.filter_type} · ترتيب {f.sort_order}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${f.is_active ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"}`}>
                  {f.is_active ? "نشط" : "معطل"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {f.options.map((o, i) => (
                  <span key={i} className="text-xs bg-muted rounded-full px-2 py-1">{o}</span>
                ))}
                {f.options.length === 0 && <span className="text-xs text-muted-foreground">لا توجد خيارات</span>}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(f)}>
                  <Pencil className="w-4 h-4 ml-1" /> تعديل
                </Button>
                <Button size="icon" variant="outline" className="text-destructive" onClick={() => { if (confirm("حذف هذا الفلتر؟")) del.mutate(f.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {filters.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">لا توجد فلاتر لهذه الماركة</div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editing ? "تعديل فلتر" : "فلتر جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: النوع، الحجم، اللون" /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} placeholder={slugify(form.name)} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>نوع الفلتر</Label>
              <Select value={form.filter_type} onValueChange={(v) => setForm({ ...form, filter_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multi">اختيارات متعددة</SelectItem>
                  <SelectItem value="single">اختيار واحد</SelectItem>
                  <SelectItem value="range">نطاق (سعر مثلاً)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الخيارات (كل خيار في سطر)</Label>
              <Textarea rows={5} value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} placeholder={"صغير\nمتوسط\nكبير"} />
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

export default AdminBrandFiltersPage;