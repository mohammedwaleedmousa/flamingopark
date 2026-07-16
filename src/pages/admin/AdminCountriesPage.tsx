import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";

interface Country {
  code: string;
  name_ar: string;
  name_en: string;
  flag_emoji: string | null;
  phone_code: string | null;
  default_currency: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
}

const AdminCountriesPage = () => {
  const [rows, setRows] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<{ code: string; name_ar: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRow, setNewRow] = useState<Partial<Country>>({});
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: cur }] = await Promise.all([
      supabase.from("countries" as any).select("*").order("sort_order"),
      supabase.from("currencies" as any).select("code,name_ar").order("sort_order"),
    ]);
    setRows((c as any) || []);
    setCurrencies((cur as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (code: string, field: keyof Country, value: any) => {
    setRows((r) => r.map((row) => row.code === code ? { ...row, [field]: value } : row));
  };

  const save = async (row: Country) => {
    const { error } = await supabase.from("countries" as any).update({
      name_ar: row.name_ar, name_en: row.name_en, flag_emoji: row.flag_emoji,
      phone_code: row.phone_code, default_currency: row.default_currency,
      is_featured: row.is_featured, is_active: row.is_active,
      sort_order: Number(row.sort_order) || 0,
    }).eq("code", row.code);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else toast({ title: "تم الحفظ" });
  };

  const remove = async (code: string) => {
    if (!confirm(`حذف الدولة ${code}؟`)) return;
    const { error } = await supabase.from("countries" as any).delete().eq("code", code);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تم الحذف" }); load(); }
  };

  const addNew = async () => {
    if (!newRow.code || !newRow.name_ar) { toast({ title: "أكمل الحقول", variant: "destructive" }); return; }
    const { error } = await supabase.from("countries" as any).insert({
      code: newRow.code.toUpperCase(),
      name_ar: newRow.name_ar,
      name_en: newRow.name_en || newRow.name_ar,
      flag_emoji: newRow.flag_emoji || null,
      phone_code: newRow.phone_code || null,
      default_currency: newRow.default_currency || 'SAR',
      is_featured: false,
      is_active: true,
      sort_order: rows.length + 1,
    });
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { setNewRow({}); toast({ title: "تمت الإضافة" }); load(); }
  };

  const filtered = rows.filter((r) =>
    !filter || r.code.includes(filter.toUpperCase()) || r.name_ar.includes(filter) || (r.name_en || "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">إدارة الدول</h1>
        <p className="text-muted-foreground text-sm">الدول المميزة تحصل على الدفع عند الاستلام (COD) ومعاملة خاصة. باقي الدول تستخدم الدفع الإلكتروني والشحن الدولي.</p>
      </div>

      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>قائمة الدول ({filtered.length})</CardTitle>
          <Input placeholder="بحث..." className="max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </CardHeader>
        <CardContent>
          {loading ? <p>جاري التحميل...</p> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العلم</TableHead>
                    <TableHead>الكود</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>كود الهاتف</TableHead>
                    <TableHead>العملة الافتراضية</TableHead>
                    <TableHead>مميزة (COD)</TableHead>
                    <TableHead>مفعّلة</TableHead>
                    <TableHead>الترتيب</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell><Input className="w-14 text-center" value={row.flag_emoji || ""} onChange={(e) => update(row.code, "flag_emoji", e.target.value)} /></TableCell>
                      <TableCell className="font-mono">{row.code}</TableCell>
                      <TableCell><Input value={row.name_ar} onChange={(e) => update(row.code, "name_ar", e.target.value)} /></TableCell>
                      <TableCell><Input className="w-20" value={row.phone_code || ""} onChange={(e) => update(row.code, "phone_code", e.target.value)} /></TableCell>
                      <TableCell>
                        <Select value={row.default_currency || ""} onValueChange={(v) => update(row.code, "default_currency", v)}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>{currencies.map((c) => <SelectItem key={c.code} value={c.code}>{c.name_ar}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Switch checked={row.is_featured} onCheckedChange={(v) => update(row.code, "is_featured", v)} /></TableCell>
                      <TableCell><Switch checked={row.is_active} onCheckedChange={(v) => update(row.code, "is_active", v)} /></TableCell>
                      <TableCell><Input className="w-16" type="number" value={row.sort_order} onChange={(e) => update(row.code, "sort_order", e.target.value)} /></TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" onClick={() => save(row)}><Save className="w-4 h-4" /></Button>
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
        <CardHeader><CardTitle>إضافة دولة جديدة</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
          <div><label className="text-xs">الكود (ISO)</label><Input placeholder="AE" value={newRow.code || ""} onChange={(e) => setNewRow((s) => ({ ...s, code: e.target.value }))} /></div>
          <div><label className="text-xs">الاسم (عربي)</label><Input placeholder="الإمارات" value={newRow.name_ar || ""} onChange={(e) => setNewRow((s) => ({ ...s, name_ar: e.target.value }))} /></div>
          <div><label className="text-xs">الاسم (إنجليزي)</label><Input placeholder="UAE" value={newRow.name_en || ""} onChange={(e) => setNewRow((s) => ({ ...s, name_en: e.target.value }))} /></div>
          <div><label className="text-xs">العلم</label><Input placeholder="🇦🇪" value={newRow.flag_emoji || ""} onChange={(e) => setNewRow((s) => ({ ...s, flag_emoji: e.target.value }))} /></div>
          <div><label className="text-xs">كود الهاتف</label><Input placeholder="+971" value={newRow.phone_code || ""} onChange={(e) => setNewRow((s) => ({ ...s, phone_code: e.target.value }))} /></div>
          <Button onClick={addNew}><Plus className="w-4 h-4 ml-1" />إضافة</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCountriesPage;