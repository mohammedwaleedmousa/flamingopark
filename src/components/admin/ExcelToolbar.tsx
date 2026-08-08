import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ExcelTableConfig } from "@/lib/admin/excelTables";

/** Flatten objects/arrays so every cell stays readable inside Excel. */
const toCell = (value: unknown): string | number | boolean | null => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
};

const parseCell = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return value;
};

const ExcelToolbar = ({ config }: { config: ExcelTableConfig }) => {
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setBusy("export");
    try {
      const { data, error } = await (supabase as any).from(config.table).select("*").limit(5000);
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      if (!rows.length) {
        toast.info("لا توجد بيانات للتصدير");
        return;
      }

      const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter(
        (c) => !(config.omit ?? []).includes(c),
      );
      const body = rows.map((row) => columns.map((c) => toCell(row[c])));
      const sheet = XLSX.utils.aoa_to_sheet([columns, ...body]);

      // Tidy column widths so the file opens well-aligned
      sheet["!cols"] = columns.map((col, i) => {
        const longest = body.reduce((max, r) => Math.max(max, String(r[i] ?? "").length), col.length);
        return { wch: Math.min(Math.max(longest + 2, 12), 48) };
      });
      sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
      sheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: body.length, c: columns.length - 1 },
        }),
      };
      columns.forEach((_, i) => {
        const ref = XLSX.utils.encode_cell({ r: 0, c: i });
        if (sheet[ref]) sheet[ref].s = { font: { bold: true } };
      });

      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, config.table.slice(0, 30));
      XLSX.writeFile(book, `${config.table}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`تم تصدير ${rows.length} صف`);
    } catch (e: any) {
      toast.error(`تعذر التصدير: ${e?.message ?? "خطأ غير معروف"}`);
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async (file: File) => {
    setBusy("import");
    try {
      const buffer = await file.arrayBuffer();
      const book = XLSX.read(buffer, { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const rows = raw
        .map((row) => {
          const out: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(row)) {
            const clean = String(key).trim();
            if (!clean) continue;
            out[clean] = parseCell(value);
          }
          return out;
        })
        .filter((row) => Object.values(row).some((v) => v !== null && v !== ""));

      if (!rows.length) {
        toast.error("الملف فارغ أو غير صالح");
        return;
      }

      let done = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const hasId = chunk.every((r) => r.id !== null && r.id !== undefined && r.id !== "");
        const query = (supabase as any).from(config.table);
        const { error } = hasId ? await query.upsert(chunk, { onConflict: "id" }) : await query.insert(chunk);
        if (error) throw error;
        done += chunk.length;
      }
      toast.success(`تم استيراد ${done} صف — حدّث الصفحة لعرض البيانات`);
    } catch (e: any) {
      toast.error(`تعذر الاستيراد: ${e?.message ?? "خطأ غير معروف"}`);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy !== null}
        onClick={() => fileRef.current?.click()}
        className="h-9 gap-2 border-border bg-card text-foreground hover:bg-muted"
      >
        {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        <span className="hidden sm:inline">استيراد Excel</span>
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={busy !== null}
        onClick={handleExport}
        className="h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        <span className="hidden sm:inline">تصدير Excel</span>
      </Button>
    </div>
  );
};

export default ExcelToolbar;
