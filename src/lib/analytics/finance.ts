import { supabase } from "../../integrations/supabase/client";
import type { Database } from "../../integrations/supabase/types";

type OrdersRow = Database["public"]["Tables"]["orders"]["Row"];
type ExpensesRow = Database["public"]["Tables"]["expenses"]["Row"];
type FinancialTxn = Database["public"]["Tables"]["financial_transactions"]["Row"];
type TransactionLine = Database["public"]["Tables"]["transaction_lines"]["Row"];

export type LedgerEntry = {
  id: string;
  date: string; // ISO date
  type: "income" | "expense" | "transaction" | "import";
  category: string;
  amount: number; // positive for income, negative for expense
  source?: string;
  description?: string;
};

export async function getOrdersRevenueEntries(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id,total,created_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((o) => ({
    id: `order-${o.id}`,
    date: o.created_at,
    type: "income" as const,
    category: "orders",
    amount: Number(o.total ?? 0),
    source: "orders",
    description: `Order ${o.id}`,
  }));
}

export async function getExpensesEntries(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("id,amount,expense_date,description,vendor")
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: `expense-${e.id}`,
    date: e.expense_date ?? e.created_at,
    type: "expense" as const,
    category: "expenses",
    amount: -(Number(e.amount ?? 0)),
    source: "expenses",
    description: e.description ?? e.vendor ?? `Expense ${e.id}`,
  }));
}

export async function getFinancialTransactionsEntries(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from<FinancialTxn>("financial_transactions")
    .select("id,entry_date,description,reference")
    .gte("entry_date", startDate)
    .lte("entry_date", endDate)
    .order("entry_date", { ascending: true });
  if (error) throw error;
  const txns = data ?? [];

  // fetch lines for transactions in range
  const txnIds = txns.map((t) => t.id);
  const { data: lines } = await supabase
    .from<TransactionLine>("transaction_lines")
    .select("id,transaction_id,debit,credit,created_at,description")
    .in("transaction_id", txnIds.length ? txnIds : [""] as string[]);

  const entries: LedgerEntry[] = [];
  for (const l of (lines ?? [])) {
    const amt = Number(l.debit ?? 0) - Number(l.credit ?? 0);
    entries.push({
      id: `line-${l.id}`,
      date: l.created_at,
      type: "transaction",
      category: "journal",
      amount: -amt, // debit positive reduces cash? we present negative for debit
      source: `txn-${l.transaction_id}`,
      description: l.description ?? "",
    });
  }
  return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Load persisted imported entries from localStorage
export function loadImportedEntries(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem("finance_imports");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LedgerEntry[];
    return parsed;
  } catch (e) {
    return [];
  }
}

export function saveImportedEntries(entries: LedgerEntry[]) {
  localStorage.setItem("finance_imports", JSON.stringify(entries));
}
