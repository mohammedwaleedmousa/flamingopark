import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, Download } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import AdminPagination from '@/components/admin/AdminPagination';

const PAGE_SIZE = 30;

interface AuditRow {
  id: number;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
}

const AdminAuditLogPage = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 350);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      if (debounced) {
        q = q.or(
          `action.ilike.%${debounced}%,entity_type.ilike.%${debounced}%,actor_email.ilike.%${debounced}%`,
        );
      }
      const { data, count: c } = await q.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (cancelled) return;
      setRows((data as AuditRow[]) ?? []);
      setCount(c ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, page]);

  const exportCSV = () => {
    const header = ['التاريخ', 'الفاعل', 'الإجراء', 'النوع', 'المعرّف', 'التفاصيل'];
    const lines = rows.map((r) =>
      [
        new Date(r.created_at).toISOString(),
        r.actor_email ?? '',
        r.action,
        r.entity_type,
        r.entity_id ?? '',
        JSON.stringify(r.details ?? {}),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            سجلّ التدقيق
          </h1>
          <p className="text-muted-foreground text-sm mt-1">جميع العمليات الإدارية الحساسة</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> تصدير CSV
        </Button>
      </div>

      <Input
        placeholder="بحث (إجراء، نوع، بريد الفاعل)..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-md"
      />

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center"><Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">لا توجد سجلات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-right p-3">التاريخ</th>
                  <th className="text-right p-3">الفاعل</th>
                  <th className="text-right p-3">الإجراء</th>
                  <th className="text-right p-3">النوع</th>
                  <th className="text-right p-3">المعرّف</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('ar')}
                    </td>
                    <td className="p-3">{r.actor_email ?? '—'}</td>
                    <td className="p-3 font-medium text-primary">{r.action}</td>
                    <td className="p-3">{r.entity_type}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{r.entity_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminPagination page={page} pageSize={PAGE_SIZE} total={count} onPageChange={setPage} />
    </div>
  );
};

export default AdminAuditLogPage;