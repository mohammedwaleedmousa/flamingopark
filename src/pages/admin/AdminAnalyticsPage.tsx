import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  BarChart3, Users, ShoppingCart, Eye, Percent, Download, Loader2, TrendingUp,
  RefreshCw, MousePointerClick,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Range = '24h' | '7d' | '30d' | '90d';
type Grain = 'hour' | 'day';

const RANGE_OPTIONS: { value: Range; label: string; ms: number; defaultGrain: Grain }[] = [
  { value: '24h', label: 'آخر 24 ساعة', ms: 24 * 3600 * 1000, defaultGrain: 'hour' },
  { value: '7d', label: 'آخر 7 أيام', ms: 7 * 24 * 3600 * 1000, defaultGrain: 'day' },
  { value: '30d', label: 'آخر 30 يوم', ms: 30 * 24 * 3600 * 1000, defaultGrain: 'day' },
  { value: '90d', label: 'آخر 90 يوم', ms: 90 * 24 * 3600 * 1000, defaultGrain: 'day' },
];

const COLORS = ['#C9A962', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

interface EventRow {
  event_type: string;
  session_id: string | null;
  user_id: string | null;
  product_id: string | null;
  value: number | null;
  utm_source: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  device: string | null;
  created_at: string;
  metadata: any;
}

const StatCard = ({ icon: Icon, label, value, hint, accent }: any) => (
  <div className="bg-card border rounded-2xl p-4 md:p-5 relative overflow-hidden">
    <div className={cn('absolute inset-0 bg-gradient-to-br opacity-40', accent)} />
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-background/80 text-primary">
          <Icon className="w-5 h-5" />
        </div>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="text-2xl md:text-3xl font-heading text-foreground tabular-nums">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  </div>
);

const AdminAnalyticsPage = () => {
  const [range, setRange] = useState<Range>('7d');
  const [grain, setGrain] = useState<Grain>('day');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const since = useMemo(() => {
    const r = RANGE_OPTIONS.find((o) => o.value === range)!;
    return new Date(Date.now() - r.ms);
  }, [range]);

  useEffect(() => {
    const r = RANGE_OPTIONS.find((o) => o.value === range)!;
    setGrain(r.defaultGrain);
  }, [range]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    // Page through up to 10k events for the window
    const pageSize = 1000;
    const out: EventRow[] = [];
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase
        .from('analytics_events')
        .select(
          'event_type, session_id, user_id, product_id, value, utm_source, utm_campaign, referrer, device, created_at, metadata',
        )
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .range(i * pageSize, (i + 1) * pageSize - 1);
      if (error) break;
      out.push(...((data as EventRow[]) ?? []));
      if (!data || data.length < pageSize) break;
    }
    setEvents(out);

    // Fetch product names for top-selling products
    const ids = Array.from(
      new Set(out.filter((e) => e.event_type === 'purchase' || e.event_type === 'product_view').map((e) => e.product_id).filter(Boolean) as string[]),
    ).slice(0, 50);
    if (ids.length) {
      const { data: prods } = await supabase.from('products').select('id, name_ar, name').in('id', ids);
      const map: Record<string, string> = {};
      (prods ?? []).forEach((p: any) => (map[p.id] = p.name_ar || p.name));
      setProductNames(map);
    }
    setLoading(false);
  }, [since]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents, refreshKey]);

  // Realtime: re-fetch on insert
  useEffect(() => {
    const ch = supabase
      .channel('analytics-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'analytics_events' }, () => {
        // Debounce-ish: bump refresh key at most every 5s
        setRefreshKey((k) => k + 1);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Aggregates
  const stats = useMemo(() => {
    const sessions = new Set<string>();
    const purchasers = new Set<string>();
    let purchases = 0;
    let revenue = 0;
    let pageViews = 0;
    let addToCart = 0;
    let beginCheckout = 0;
    for (const e of events) {
      if (e.session_id) sessions.add(e.session_id);
      if (e.event_type === 'page_view') pageViews++;
      if (e.event_type === 'add_to_cart') addToCart++;
      if (e.event_type === 'begin_checkout') beginCheckout++;
      if (e.event_type === 'purchase') {
        purchases++;
        revenue += Number(e.value) || 0;
        if (e.session_id) purchasers.add(e.session_id);
      }
    }
    const visitors = sessions.size;
    const conv = visitors ? (purchasers.size / visitors) * 100 : 0;
    const cartConv = addToCart ? (purchases / addToCart) * 100 : 0;
    return { visitors, pageViews, addToCart, beginCheckout, purchases, revenue, conv, cartConv };
  }, [events]);

  // Time series
  const timeSeries = useMemo(() => {
    const bucket = (d: Date) => {
      const x = new Date(d);
      if (grain === 'hour') x.setMinutes(0, 0, 0);
      else x.setHours(0, 0, 0, 0);
      return x.toISOString();
    };
    const buckets: Record<string, { t: string; visitors: Set<string>; orders: number; revenue: number }> = {};
    for (const e of events) {
      const key = bucket(new Date(e.created_at));
      if (!buckets[key]) buckets[key] = { t: key, visitors: new Set(), orders: 0, revenue: 0 };
      if (e.session_id) buckets[key].visitors.add(e.session_id);
      if (e.event_type === 'purchase') {
        buckets[key].orders += 1;
        buckets[key].revenue += Number(e.value) || 0;
      }
    }
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return grain === 'hour'
        ? d.toLocaleTimeString('ar', { hour: '2-digit' })
        : d.toLocaleDateString('ar', { day: '2-digit', month: '2-digit' });
    };
    return Object.values(buckets)
      .sort((a, b) => a.t.localeCompare(b.t))
      .map((b) => ({ label: fmt(b.t), زوار: b.visitors.size, طلبات: b.orders, إيراد: Math.round(b.revenue) }));
  }, [events, grain]);

  // Top products by purchases
  const topProducts = useMemo(() => {
    const map: Record<string, { id: string; qty: number; rev: number }> = {};
    for (const e of events) {
      if (e.event_type !== 'purchase' || !e.metadata) continue;
      // metadata may have items_count only — fallback to product_id
      if (e.product_id) {
        map[e.product_id] = map[e.product_id] || { id: e.product_id, qty: 0, rev: 0 };
        map[e.product_id].qty += 1;
        map[e.product_id].rev += Number(e.value) || 0;
      }
    }
    // Also incorporate add_to_cart product_ids as a popularity hint when no purchases
    if (!Object.keys(map).length) {
      for (const e of events) {
        if (e.event_type !== 'add_to_cart' || !e.product_id) continue;
        map[e.product_id] = map[e.product_id] || { id: e.product_id, qty: 0, rev: 0 };
        map[e.product_id].qty += 1;
      }
    }
    return Object.values(map)
      .map((p) => ({ ...p, name: productNames[p.id] || p.id.slice(0, 8) }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [events, productNames]);

  // Traffic sources (utm_source / referrer / direct)
  const sources = useMemo(() => {
    const sess: Record<string, string> = {};
    for (const e of events) {
      if (!e.session_id) continue;
      if (sess[e.session_id]) continue;
      const src = e.utm_source
        ? e.utm_source
        : e.referrer
          ? new URL(e.referrer).hostname.replace('www.', '')
          : 'مباشر';
      sess[e.session_id] = src;
    }
    const counts: Record<string, number> = {};
    Object.values(sess).forEach((s) => (counts[s] = (counts[s] || 0) + 1));
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [events]);

  // Campaign performance
  const campaigns = useMemo(() => {
    const map: Record<string, { name: string; sessions: Set<string>; purchases: number; revenue: number }> = {};
    for (const e of events) {
      if (!e.utm_campaign) continue;
      const key = e.utm_campaign;
      if (!map[key]) map[key] = { name: key, sessions: new Set(), purchases: 0, revenue: 0 };
      if (e.session_id) map[key].sessions.add(e.session_id);
      if (e.event_type === 'purchase') {
        map[key].purchases += 1;
        map[key].revenue += Number(e.value) || 0;
      }
    }
    return Object.values(map).map((c) => ({
      name: c.name,
      sessions: c.sessions.size,
      purchases: c.purchases,
      revenue: Math.round(c.revenue),
      conv: c.sessions.size ? +((c.purchases / c.sessions.size) * 100).toFixed(2) : 0,
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [events]);

  // Funnel
  const funnel = useMemo(() => {
    const counts = { page_view: 0, product_view: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0 };
    for (const e of events) {
      if (e.event_type in counts) (counts as any)[e.event_type] += 1;
    }
    return [
      { name: 'مشاهدات', value: counts.page_view },
      { name: 'منتج', value: counts.product_view },
      { name: 'إضافة سلة', value: counts.add_to_cart },
      { name: 'بدء دفع', value: counts.begin_checkout },
      { name: 'شراء', value: counts.purchase },
    ];
  }, [events]);

  const exportCSV = (rows: any[], name: string) => {
    if (!rows.length) return;
    const header = Object.keys(rows[0]);
    const lines = rows.map((r) => header.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            التقارير والتحليلات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            بيانات حقيقية محدّثة لحظياً — زوار، تحويل، إعلانات، أفضل المنتجات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={grain} onValueChange={(v) => setGrain(v as Grain)}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">بالساعة</SelectItem>
              <SelectItem value="day">باليوم</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setRefreshKey((k) => k + 1)} aria-label="تحديث">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label="زوار فريدون" value={stats.visitors.toLocaleString('en')} accent="from-blue-500/10 to-blue-600/5" />
        <StatCard icon={Eye} label="مشاهدات الصفحات" value={stats.pageViews.toLocaleString('en')} accent="from-cyan-500/10 to-cyan-600/5" />
        <StatCard icon={MousePointerClick} label="إضافة للسلة" value={stats.addToCart.toLocaleString('en')} accent="from-amber-500/10 to-amber-600/5" />
        <StatCard icon={ShoppingCart} label="طلبات" value={stats.purchases.toLocaleString('en')} accent="from-emerald-500/10 to-emerald-600/5" />
        <StatCard icon={TrendingUp} label="إيرادات" value={stats.revenue.toLocaleString('en', { maximumFractionDigits: 0 })} hint="عملة الموقع" accent="from-primary/10 to-primary/5" />
        <StatCard icon={Percent} label="معدل التحويل" value={`${stats.conv.toFixed(2)}%`} hint={`سلة→شراء ${stats.cartConv.toFixed(1)}%`} accent="from-violet-500/10 to-violet-600/5" />
      </div>

      {loading && events.length === 0 ? (
        <div className="p-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>
      ) : (
        <>
          {/* Time series */}
          <div className="bg-card border rounded-2xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg">حركة الزوار والطلبات</h2>
              <Button variant="ghost" size="sm" onClick={() => exportCSV(timeSeries, 'timeseries')} className="gap-1">
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
                  <Legend />
                  <Line type="monotone" dataKey="زوار" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="طلبات" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="إيراد" stroke="#C9A962" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Funnel */}
            <div className="bg-card border rounded-2xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg">قمع التحويل</h2>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(funnel, 'funnel')} className="gap-1">
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
              </div>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={funnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
                    <Bar dataKey="value" fill="#C9A962" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sources */}
            <div className="bg-card border rounded-2xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg">مصادر العملاء</h2>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(sources, 'sources')} className="gap-1">
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
              </div>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={sources} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {sources.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top products */}
            <div className="bg-card border rounded-2xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg">المنتجات الأكثر مبيعاً</h2>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(topProducts, 'top-products')} className="gap-1">
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
              </div>
              {topProducts.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">لا توجد بيانات مبيعات بعد</div>
              ) : (
                <ul className="divide-y">
                  {topProducts.map((p, i) => (
                    <li key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">{i + 1}</span>
                        <span className="truncate text-sm">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span><span className="font-medium text-foreground">{p.qty}</span> طلب</span>
                        {p.rev > 0 && <span><span className="font-medium text-foreground">{Math.round(p.rev)}</span></span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Campaigns */}
            <div className="bg-card border rounded-2xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg">أداء الحملات الإعلانية</h2>
                <Button variant="ghost" size="sm" onClick={() => exportCSV(campaigns, 'campaigns')} className="gap-1">
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
              </div>
              {campaigns.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  لم تُسجَّل زيارات مع utm_campaign بعد.<br />
                  <span className="text-xs">أضف <code>?utm_source=fb&utm_campaign=summer</code> في روابط إعلاناتك.</span>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr><th className="text-right px-5 py-2">الحملة</th><th className="text-right px-2 py-2">جلسات</th><th className="text-right px-2 py-2">طلبات</th><th className="text-right px-2 py-2">إيراد</th><th className="text-right px-5 py-2">تحويل</th></tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c) => (
                        <tr key={c.name} className="border-t">
                          <td className="px-5 py-2 font-medium text-foreground truncate max-w-[150px]">{c.name}</td>
                          <td className="px-2 py-2 tabular-nums">{c.sessions}</td>
                          <td className="px-2 py-2 tabular-nums">{c.purchases}</td>
                          <td className="px-2 py-2 tabular-nums">{c.revenue}</td>
                          <td className="px-5 py-2 tabular-nums text-primary">{c.conv}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;