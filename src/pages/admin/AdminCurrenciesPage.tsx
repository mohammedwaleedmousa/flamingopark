import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hydrateCurrencies } from "@/lib/currency";
import { Plus, Trash2, Save } from "lucide-react";

interface Currency {
  code: string;
  name_ar: string;
  name_en: string;
  symbol: string;
  rate_to_base: number;
  is_base: boolean;
  is_active: boolean;
  sort_order: number;
}

const AdminCurrenciesPage = () => {
  const [rows, setRows] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<Partial<Currency>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("currencies" as any).select("*").order("sort_order");
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateField = (code: string, field: keyof Currency, value: any) => {
    setRows((r) => r.map((row) => row.code === code ? { ...row, [field]: value } : row));
  };

  const save = async (row: Currency) => {
    setSaving(row.code);
    const { error } = await supabase.from("currencies" as any).update({
      name_ar: row.name_ar, name_en: row.name_en, symbol: row.symbol,
      rate_to_base: Number(row.rate_to_base), is_base: row.is_base,
      is_active: row.is_active, sort_order: Number(row.sort_order) || 0,
    }).eq("code", row.code);
    setSaving(null);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else {
      toast({ title: "تم الحفظ" });
      await hydrateCurrencies(true);
    }
  };

  const remove = async (code: string) => {
    if (!confirm(`حذف العملة ${code}؟`)) return;
    const { error } = await supabase.from("currencies" as any).delete().eq("code", code);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تم الحذف" }); load(); hydrateCurrencies(true); }
  };

  const addNew = async () => {
    if (!newRow.code || !newRow.name_ar || !newRow.symbol) {
      toast({ title: "أكمل الحقول المطلوبة", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("currencies" as any).insert({
      code: newRow.code.toUpperCase(),
      name_ar: newRow.name_ar,
      name_en: newRow.name_en || newRow.name_ar,
      symbol: newRow.symbol,
      rate_to_base: Number(newRow.rate_to_base) || 1,
      is_base: false,
      is_active: true,
      sort_order: Number(newRow.sort_order) || rows.length + 1,
    });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { setNewRow({}); toast({ title: "تمت الإضافة" }); load(); hydrateCurrencies(true); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">إدارة العملات</h1>
        <p className="text-muted-foreground text-sm">
          العملة الأساسية للتسعير هي التي عليها is_base=true. باقي العملات = كم يساوي 1 من العملة الأساسية بهذه العملة.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>العملات الحالية</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p>جاري التحميل...</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>الاسم (عربي)</TableHead>
                    <TableHead>الرمز</TableHead>
                    <TableHead>سعر الصرف</TableHead>
                    <TableHead>أساسية</TableHead>
                    <TableHead>مفعّلة</TableHead>
                    <TableHead>الترتيب</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className="font-mono">{row.code}</TableCell>
                      <TableCell><Input value={row.name_ar} onChange={(e) => updateField(row.code, "name_ar", e.target.value)} /></TableCell>
                      <TableCell><Input className="w-20" value={row.symbol} onChange={(e) => updateField(row.code, "symbol", e.target.value)} /></TableCell>
                      <TableCell><Input className="w-28" type="number" step="0.000001" value={row.rate_to_base} onChange={(e) => updateField(row.code, "rate_to_base", e.target.value)} /></TableCell>
                      <TableCell><Switch checked={row.is_base} onCheckedChange={(v) => updateField(row.code, "is_base", v)} /></TableCell>
                      <TableCell><Switch checked={row.is_active} onCheckedChange={(v) => updateField(row.code, "is_active", v)} /></TableCell>
                      <TableCell><Input className="w-16" type="number" value={row.sort_order} onChange={(e) => updateField(row.code, "sort_order", e.target.value)} /></TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" onClick={() => save(row)} disabled={saving === row.code}><Save className="w-4 h-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(row.code)}><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>إضافة عملة جديدة</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div><label className="text-xs">الكود</label><Input placeholder="USD" value={newRow.code || ""} onChange={(e) => setNewRow((s) => ({ ...s, code: e.target.value }))} /></div>
          <div><label className="text-xs">الاسم (عربي)</label><Input placeholder="دولار أمريكي" value={newRow.name_ar || ""} onChange={(e) => setNewRow((s) => ({ ...s, name_ar: e.target.value }))} /></div>
          <div><label className="text-xs">الاسم (إنجليزي)</label><Input placeholder="US Dollar" value={newRow.name_en || ""} onChange={(e) => setNewRow((s) => ({ ...s, name_en: e.target.value }))} /></div>
          <div><label className="text-xs">الرمز</label><Input placeholder="$" value={newRow.symbol || ""} onChange={(e) => setNewRow((s) => ({ ...s, symbol: e.target.value }))} /></div>
          <div><label className="text-xs">سعر الصرف</label><Input type="number" step="0.000001" placeholder="0.27" value={newRow.rate_to_base ?? ""} onChange={(e) => setNewRow((s) => ({ ...s, rate_to_base: Number(e.target.value) }))} /></div>
          <Button onClick={addNew}><Plus className="w-4 h-4 ml-1" />إضافة</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCurrenciesPage;