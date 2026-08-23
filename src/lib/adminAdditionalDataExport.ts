import { supabase } from "@/integrations/supabase/client";
import { exportXlsx, type XlsxColumn } from "@/lib/xlsxExport";

const db = supabase as any;

export type AdditionalExportDefinition = {
  filename: string;
  sheetName: string;
  columns: XlsxColumn[];
  loadRows: () => Promise<Array<Record<string, unknown>>>;
};

const questionsDefinition = (): AdditionalExportDefinition => ({
  filename: `flamingo-product-questions-${new Date().toISOString().slice(0, 10)}`,
  sheetName: "أسئلة العملاء",
  columns: [
    { key: "customer", header: "العميل", width: 24 },
    { key: "product", header: "المنتج", width: 30 },
    { key: "question", header: "السؤال", width: 50 },
    { key: "answer", header: "الرد", width: 50 },
    { key: "answered", header: "تم الرد", width: 12 },
    { key: "created_at", header: "تاريخ السؤال", width: 22 },
  ],
  loadRows: async () => {
    const { data, error } = await db
      .from("product_questions")
      .select("id,product_id,content,content_ar,answer,answer_ar,author,created_at,products(name_ar,name,slug)")
      .order("created_at", { ascending: false })
      .range(0, 4999);
    if (error) throw error;

    return (data || []).map((row: any) => ({
      customer: row.author || "",
      product: row.products?.name_ar || row.products?.name || row.products?.slug || row.product_id || "",
      question: row.content_ar || row.content || "",
      answer: row.answer_ar || row.answer || "",
      answered: row.answer_ar || row.answer ? "نعم" : "لا",
      created_at: row.created_at ? new Date(row.created_at).toLocaleString("ar-YE") : "",
    }));
  },
});

export const getAdditionalAdminExportDefinition = (pathname: string): AdditionalExportDefinition | null => {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin/product-questions") return questionsDefinition();
  return null;
};

export const exportAdditionalAdminPageData = async (pathname: string) => {
  const definition = getAdditionalAdminExportDefinition(pathname);
  if (!definition) throw new Error("هذه الصفحة لا تحتوي على تصدير بيانات");
  const rows = await definition.loadRows();
  exportXlsx({ filename: definition.filename, sheetName: definition.sheetName, columns: definition.columns, rows });
  return rows.length;
};
