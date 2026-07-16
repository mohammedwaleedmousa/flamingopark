import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker, useDateRange } from "@/lib/analytics/dateRange";
import { fmtMoney, orderTotalBase, currencyOptions } from "./reportHelpers";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { DollarSign, TrendingDown, TrendingUp, Wallet, PieChart as PIcon } from "lucide-react";

type OrderRow = { id: string; total: number; total_base: number | null; created_at: string; status: string; items: any; discount_amount: number | null; currency_code: string | null };
type Expense = { id: string; amount: number; created_at: string; category_id: string | null; description: string | null };
type Product = { id: string; cost_price: number | null; price: number };

export default function ReportsFinancePage() {
  const { range } = useDateRange();
  const [currency, setCurrency] = useState("SAR");
  const options = currencyOptions();

  const startISO = new Date(range.start + "T00:00:00").toISOString();
  const endISO = new Date(range.end + "T23:59:59").toISOString();

  const { data: orders = [] } = useQuery({
    queryKey: ["reports-fin-orders", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders")
        .select("id,total,total_base,created_at,status,items,discount_amount,currency_code")
        .gte("created_at", startISO).lte("created_at", endISO);
      if (error) throw error;
      return (data || []) as OrderRow[];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["reports-fin-expenses", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("expenses")
        .select("id,amount,created_at,category_id,description")
        .gte("created_at", startISO).lte("created_at", endISO);
      if (error) return [] as Expense[];
      return (data || []) as Expense[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["reports-fin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,cost_price,price");
      if (error) throw error;
      return (data || []) as Product[];
    },
  });

  const costMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.id, Number(p.cost_price) || 0);
    return m;
  }, [products]);

  const valid = orders.filter((o) => o.status !== "cancelled");

  const { revenue, cost, discounts, profit, byCurrency } = useMemo(() => {
    let revenue = 0, cost = 0, discounts = 0;
    const byCurr = new Map<string, { code: string; revenue: number; orders: number }>();
    for (const o of valid) {
      const rev = orderTotalBase(o);
      revenue += rev;
      discounts += Number(o.discount_amount) || 0;
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        const c = costMap.get(String(it.product_id)) || 0;
        cost += c * (Number(it.quantity) || 0);
      }
      const code = o.currency_code || "SAR";
      const cur = byCurr.get(code) || { code, revenue: 0, orders: 0 };
      cur.revenue += rev; cur.orders += 1;
      byCurr.set(code, cur);
    }
    const profit = revenue - cost - discounts;
    return { revenue, cost, discounts, profit, byCurrency: Array.from(byCurr.values()) };
  }, [valid, costMap]);

  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netProfit = profit - totalExpenses;

  const daily = useMemo(() => {
    const map = new Map<string, { day: string; revenue: number; cost: number; profit: number }>();
    for (const o of valid) {
      const d = o.created_at.slice(0, 10);
      const row = map.get(d) || { day: d, revenue: 0, cost: 0, profit: 0 };
      row.revenue += orderTotalBase(o);
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) row.cost += (costMap.get(String(it.product_id)) || 0) * (Number(it.quantity) || 0);
      row.profit = row.revenue - row.cost;
      map.set(d, row);
    }
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [valid, costMap]);

  const kpiCards = [
    { icon: DollarSign, label: "الإيرادات", value: fmtMoney(revenue, currency), color: "from-emerald-500 to-emerald-600" },
    { icon: TrendingDown, label: "تكلفة البضاعة", value: fmtMoney(cost, currency), color: "from-orange-500 to-orange-600" },
    { icon: TrendingDown, label: "الخصومات", value: fmtMoney(discounts, currency), color: "from-red-500 to-red-600" },
    { icon: TrendingUp, label: "الربح الإجمالي", value: fmtMoney(profit, currency), color: "from-amber-500 to-amber-600" },
    { icon: Wallet, label: "المصروفات", value: fmtMoney(totalExpenses, currency), color: "from-rose-500 to-rose-600" },
    { icon: PIcon, label: "صافي الربح", value: fmtMoney(netProfit, currency), color: netProfit >= 0 ? "from-green-500 to-emerald-700" : "from-red-500 to-rose-700" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl">الأرباح والمالية</h1>
        <div className="flex items-center gap-2">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{options.map((o) => <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <DateRangePicker />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label} className="border-black/5">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.color} text-white flex items-center justify-center mb-2`}>
                <k.icon className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">الإيراد والتكلفة والربح — يومياً</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="day" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v), currency)} />
                <Legend />
                <Bar dataKey="revenue" name="الإيراد" fill="#10b981" />
                <Bar dataKey="cost" name="التكلفة" fill="#f59e0b" />
                <Bar dataKey="profit" name="الربح" fill="#e91e63" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">الإيرادات حسب عملة الطلب</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>العملة</TableHead><TableHead>الطلبات</TableHead><TableHead>الإيراد ({currency})</TableHead></TableRow></TableHeader>
              <TableBody>
                {byCurrency.map((c) => (
                  <TableRow key={c.code}>
                    <TableCell>{c.code}</TableCell>
                    <TableCell>{c.orders}</TableCell>
                    <TableCell>{fmtMoney(c.revenue, currency)}</TableCell>
                  </TableRow>
                ))}
                {!byCurrency.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">لا توجد بيانات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">أحدث المصروفات</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>الوصف</TableHead><TableHead>المبلغ</TableHead><TableHead>التاريخ</TableHead></TableRow></TableHeader>
              <TableBody>
                {expenses.slice(0, 10).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="max-w-[220px] truncate">{e.description || "-"}</TableCell>
                    <TableCell>{fmtMoney(Number(e.amount) || 0, currency)}</TableCell>
                    <TableCell className="text-xs">{e.created_at.slice(0, 10)}</TableCell>
                  </TableRow>
                ))}
                {!expenses.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">لا توجد مصروفات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}