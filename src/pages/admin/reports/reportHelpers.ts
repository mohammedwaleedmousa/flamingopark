import { CURRENCY_RATES, convertPrice } from "@/lib/currency";

export function fmtMoney(baseSAR: number, mode: string): string {
  const meta = CURRENCY_RATES[mode] || CURRENCY_RATES.SAR;
  const val = convertPrice(baseSAR || 0, mode);
  return `${val.toLocaleString("en-US")} ${meta?.symbol || ""}`.trim();
}

export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => escape((r as any)[c])).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Convert order.total to base SAR using total_base if present, else assume already SAR. */
export function orderTotalBase(o: { total?: number | null; total_base?: number | null }): number {
  const b = Number(o.total_base ?? 0);
  if (b > 0) return b;
  return Number(o.total ?? 0);
}

export function currencyOptions() {
  return Object.entries(CURRENCY_RATES)
    .filter(([, m]) => m.isActive !== false)
    .sort(([, a], [, b]) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(([code, m]) => ({ code, label: `${m.label} (${m.short})` }));
}