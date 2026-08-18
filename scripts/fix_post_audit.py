from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(path: str, old: str, new: str, count: int | None = None) -> None:
    p = ROOT / path
    text = p.read_text(encoding="utf-8")
    actual = text.count(old)
    if actual == 0:
        raise RuntimeError(f"Pattern not found in {path}: {old[:120]!r}")
    if count is not None and actual != count:
        raise RuntimeError(f"Unexpected pattern count in {path}: expected {count}, got {actual}")
    p.write_text(text.replace(old, new), encoding="utf-8")


def main() -> None:
    # Product SEO: persist the correct canonical domain/currency in source.
    patch("src/pages/ProductDetailPage.tsx", 'const siteUrl = "https://flamingopark.store";', 'const siteUrl = "https://flamingoparkaden.com";')
    patch("src/pages/ProductDetailPage.tsx", 'priceCurrency: "YER",', 'priceCurrency: "SAR",')

    # Product detail must never request the private cost field.
    patch(
        "src/pages/ProductDetailPage.tsx",
        "id,name,name_ar,slug,price,cost_price,original_price,discount,description,description_ar,images,category,category_id,brand,in_stock,stock_quantity,countries,is_featured,is_best_seller,accessories,has_sizes,sizes,features,color_variants,specs,return_policy,has_quality_variants,quality_variants",
        "id,name,name_ar,slug,price,original_price,discount,description,description_ar,images,category,category_id,brand,in_stock,stock_quantity,countries,is_featured,is_best_seller,accessories,has_sizes,sizes,features,color_variants,specs,return_policy,has_quality_variants,quality_variants",
    )
    patch("src/pages/ProductDetailPage.tsx", "        costPrice: data.cost_price ? Number(data.cost_price) : undefined,\n", "")

    # Admin product editor: read/write cost through the admin-only product_costs table.
    patch(
        "src/pages/admin/AdminProductFormPage.tsx",
        "    } else {\n      setSelectedCategoryId(data.category_id || null);",
        "    } else {\n      const { data: costRow } = await (supabase as any)\n        .from('product_costs')\n        .select('cost_price')\n        .eq('product_id', data.id)\n        .maybeSingle();\n      setSelectedCategoryId(data.category_id || null);",
    )
    patch("src/pages/admin/AdminProductFormPage.tsx", "        cost_price: data.cost_price?.toString() || '',", "        cost_price: costRow?.cost_price?.toString() || '',")
    patch("src/pages/admin/AdminProductFormPage.tsx", "      cost_price: formData.cost_price ? parseLocalizedNumber(formData.cost_price) || 0 : 0,\n", "")
    patch(
        "src/pages/admin/AdminProductFormPage.tsx",
        "        savedProductId = inserted.id;\n      }\n\n      // inventory_skus هو مصدر الحقيقة للمخزون.",
        "        savedProductId = inserted.id;\n      }\n\n      const secureCost = Math.max(0, formData.cost_price ? parseLocalizedNumber(formData.cost_price) || 0 : 0);\n      const { error: costError } = await (supabase as any)\n        .from('product_costs')\n        .upsert({ product_id: savedProductId, cost_price: secureCost, updated_at: new Date().toISOString() }, { onConflict: 'product_id' });\n      if (costError) throw costError;\n\n      // inventory_skus هو مصدر الحقيقة للمخزون.",
    )

    # Admin products list no longer requests the intentionally-null public cost column.
    patch("src/pages/admin/AdminProductsPage.tsx", "  cost_price: number | null;\n", "")
    patch(
        "src/pages/admin/AdminProductsPage.tsx",
        "id,name,name_ar,slug,price,cost_price,discount,category,category_id,brand,brand_id,in_stock,is_active,countries,images,color_variants,sort_order",
        "id,name,name_ar,slug,price,discount,category,category_id,brand,brand_id,in_stock,is_active,countries,images,color_variants,sort_order",
    )

    # Generic admin service should not depend on products.cost_price.
    patch(
        "src/lib/admin/service.ts",
        "id,name,name_ar,slug,price,cost_price,discount,category,brand,in_stock,is_active,countries,images,sort_order,created_at",
        "id,name,name_ar,slug,price,discount,category,brand,in_stock,is_active,countries,images,sort_order,created_at",
    )

    # Finance report joins the protected one-to-one product_costs relation.
    patch(
        "src/pages/admin/reports/ReportsFinancePage.tsx",
        '      const { data, error } = await supabase.from("products").select("id,cost_price,price");',
        '      const { data, error } = await (supabase as any).from("products").select("id,price,product_costs(cost_price)");',
    )
    patch(
        "src/pages/admin/reports/ReportsFinancePage.tsx",
        "        ...row,\n        cost_price: row.cost_price == null ? null : Number(row.cost_price),\n        price: Number(row.price || 0),",
        "        ...row,\n        cost_price: Number(Array.isArray(row.product_costs) ? row.product_costs[0]?.cost_price || 0 : row.product_costs?.cost_price || 0),\n        price: Number(row.price || 0),",
    )

    # Inventory UI reads protected costs through the relationship as well.
    patch(
        "src/pages/admin/AdminInventoryAdjustmentsPage.tsx",
        '      let query = supabase.from("products").select("id,name,name_ar,brand,cost_price,price,stock_quantity,in_stock,is_active,images,color_variants,has_sizes,sizes,has_quality_variants", { count: "exact" });',
        '      let query = (supabase as any).from("products").select("id,name,name_ar,brand,price,stock_quantity,in_stock,is_active,images,color_variants,has_sizes,sizes,has_quality_variants,product_costs(cost_price)", { count: "exact" });',
    )
    patch(
        "src/pages/admin/AdminInventoryAdjustmentsPage.tsx",
        '      return { rows: (data || []) as Product[], total: count || 0 };',
        '      const rows = (data || []).map((row: any) => ({ ...row, cost_price: Number(Array.isArray(row.product_costs) ? row.product_costs[0]?.cost_price || 0 : row.product_costs?.cost_price || 0) }));\n      return { rows: rows as Product[], total: count || 0 };',
    )

    # Payment-method source must match DB-supported types directly.
    patch("src/pages/admin/AdminPaymentMethodsPage.tsx", '                    <SelectItem value="card">بطاقة</SelectItem>\n', "", 1)
    patch("src/pages/admin/AdminPaymentMethodsPage.tsx", '                    <SelectItem value="wallet">محفظة إلكترونية</SelectItem>\n', "", 1)
    patch("src/pages/admin/AdminPaymentMethodsPage.tsx", '                        <SelectItem value="card">بطاقة</SelectItem>\n', "", 1)
    patch("src/pages/admin/AdminPaymentMethodsPage.tsx", '                        <SelectItem value="wallet">محفظة إلكترونية</SelectItem>\n', "", 1)
    anchor = '      if (!nameAr) throw new Error("الاسم العربي مطلوب.");\n'
    validation = (
        '      if (!["cash", "bank"].includes(methodForm.type)) throw new Error("نوع الدفع غير مدعوم في صفحة الدفع الحالية.");\n'
        '      if (methodForm.type === "bank" && code !== "bank") throw new Error("كود التحويل البنكي يجب أن يكون bank حتى يتوافق مع صفحة الدفع.");\n'
        '      if (methodForm.type === "cash" && !["cash", "cod"].includes(code)) throw new Error("كود الدفع النقدي يجب أن يكون cash أو cod حتى يتوافق مع صفحة الدفع.");\n'
    )
    patch("src/pages/admin/AdminPaymentMethodsPage.tsx", anchor, anchor + validation)
    patch("src/pages/admin/AdminPaymentMethodsPage.tsx", 'placeholder="cod أو transfer"', 'placeholder="cash أو cod أو bank"')

    # Remove the duplicated customer brand-section routes (keep the first pair).
    app = ROOT / "src/App.tsx"
    text = app.read_text(encoding="utf-8")
    pair = '            <Route path="/brands/:slug/sections/:sectionSlug" element={<ProtectedRoute><BrandSectionPage /></ProtectedRoute>} />\n            <Route path="/brand/:slug/sections/:sectionSlug" element={<ProtectedRoute><BrandSectionPage /></ProtectedRoute>} />\n'
    if text.count(pair) != 2:
        raise RuntimeError(f"Expected duplicated brand route pair twice, got {text.count(pair)}")
    first = text.find(pair)
    second = text.find(pair, first + len(pair))
    app.write_text(text[:second] + text[second + len(pair):], encoding="utf-8")

    # Once the real source is corrected, the Vite text-rewrite guard is unnecessary.
    vite = ROOT / "vite.config.ts"
    vite_text = vite.read_text(encoding="utf-8")
    start = vite_text.find("const launchReadinessGuard = (): Plugin => ({")
    end_marker = "\n\n// https://vitejs.dev/config/"
    end = vite_text.find(end_marker)
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError("Could not locate launchReadinessGuard in vite.config.ts")
    vite_text = vite_text[:start] + vite_text[end + 2:]
    vite_text = vite_text.replace('import { defineConfig, type Plugin } from "vite";', 'import { defineConfig } from "vite";')
    vite_text = vite_text.replace("    launchReadinessGuard(),\n", "")
    vite.write_text(vite_text, encoding="utf-8")

    print("Post-audit source fixes applied successfully.")


if __name__ == "__main__":
    main()
