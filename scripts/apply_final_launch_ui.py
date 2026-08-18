from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def run(*args: str) -> None:
    subprocess.run(list(args), cwd=ROOT, check=True)


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
    status = subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip()
    if status:
        raise RuntimeError("Working tree is not clean. Commit/stash local changes first.")

    run("git", "switch", "main")
    run("git", "pull", "--ff-only", "origin", "main")
    branch = "fix/final-launch-ui"
    existing = subprocess.run(["git", "show-ref", "--verify", "--quiet", f"refs/heads/{branch}"], cwd=ROOT).returncode == 0
    if existing:
        run("git", "branch", "-D", branch)
    run("git", "switch", "-c", branch)

    patch("src/pages/ProductDetailPage.tsx", 'const WHATSAPP_URL = "https://wa.me/967778579777";', 'const DEFAULT_WHATSAPP = "967778579777";')
    patch("src/pages/ProductDetailPage.tsx", '  const country = "GLOBAL" as any;\n\n  const [selectedImage, setSelectedImage] = useState(0);', '''  const country = "GLOBAL" as any;\n\n  const [storeWhatsapp, setStoreWhatsapp] = useState(DEFAULT_WHATSAPP);\n\n  useEffect(() => {\n    let active = true;\n    void supabase.from("site_settings").select("key,value").in("key", ["whatsapp", "whatsapp_ye", "whatsapp_sa"]).then(({ data }) => {\n      if (!active) return;\n      const settings = Object.fromEntries((data || []).map((item) => [item.key, item.value]));\n      const candidate = settings.whatsapp || settings.whatsapp_ye || settings.whatsapp_sa || DEFAULT_WHATSAPP;\n      const digits = String(candidate || "").replace(/\\D/g, "");\n      setStoreWhatsapp(digits || DEFAULT_WHATSAPP);\n    });\n    return () => { active = false; };\n  }, []);\n\n  const whatsappUrl = `https://wa.me/${storeWhatsapp}`;\n\n  const [selectedImage, setSelectedImage] = useState(0);''')
    patch("src/pages/ProductDetailPage.tsx", "id,name,name_ar,slug,price,cost_price,original_price,discount,description,description_ar,images,category,category_id,brand,in_stock,stock_quantity,countries,is_featured,is_best_seller,accessories,has_sizes,sizes,features,color_variants,specs,return_policy,has_quality_variants,quality_variants", "id,name,name_ar,slug,price,original_price,discount,description,description_ar,images,category,category_id,brand,in_stock,stock_quantity,countries,is_featured,is_best_seller,accessories,has_sizes,sizes,features,color_variants,specs,return_policy,has_quality_variants,quality_variants")
    patch("src/pages/ProductDetailPage.tsx", "        costPrice: data.cost_price ? Number(data.cost_price) : undefined,\n", "")
    patch("src/pages/ProductDetailPage.tsx", '    const siteUrl = "https://flamingopark.store";', '    const siteUrl = "https://flamingoparkaden.com";')
    patch("src/pages/ProductDetailPage.tsx", '        priceCurrency: "YER",', '        priceCurrency: "SAR",')
    patch("src/pages/ProductDetailPage.tsx", "href={WHATSAPP_URL}", "href={whatsappUrl}", 2)

    patch("src/pages/OrderConfirmationPage.tsx", 'const STORE_WHATSAPP = "967778579777";', 'const DEFAULT_WHATSAPP = "967778579777";')
    patch("src/pages/OrderConfirmationPage.tsx", '  const [isConfirmed, setIsConfirmed] = useState(false);\n\n  const invoiceRef = useRef<HTMLDivElement>(null);', '''  const [isConfirmed, setIsConfirmed] = useState(false);\n  const [storeWhatsapp, setStoreWhatsapp] = useState(DEFAULT_WHATSAPP);\n\n  useEffect(() => {\n    let active = true;\n    void supabase.from("site_settings").select("key,value").in("key", ["whatsapp", "whatsapp_ye", "whatsapp_sa"]).then(({ data }) => {\n      if (!active) return;\n      const settings = Object.fromEntries((data || []).map((item) => [item.key, item.value]));\n      const candidate = settings.whatsapp || settings.whatsapp_ye || settings.whatsapp_sa || DEFAULT_WHATSAPP;\n      const digits = String(candidate || "").replace(/\\D/g, "");\n      setStoreWhatsapp(digits || DEFAULT_WHATSAPP);\n    });\n    return () => { active = false; };\n  }, []);\n\n  const invoiceRef = useRef<HTMLDivElement>(null);''')
    patch("src/pages/OrderConfirmationPage.tsx", '    const whatsappUrl = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;', '    const whatsappUrl = `https://wa.me/${storeWhatsapp}?text=${encodeURIComponent(message)}`;')

    patch("src/pages/admin/AdminProductFormPage.tsx", "      price < 0 && 'سعر البيع',", "      price <= 0 && 'سعر البيع',")
    patch("src/pages/admin/AdminProductFormPage.tsx", '''    } else {\n      setSelectedCategoryId(data.category_id || null);''', '''    } else {\n      const { data: costRow } = await (supabase as any)\n        .from('product_costs')\n        .select('cost_price')\n        .eq('product_id', data.id)\n        .maybeSingle();\n      setSelectedCategoryId(data.category_id || null);''')
    patch("src/pages/admin/AdminProductFormPage.tsx", "        cost_price: data.cost_price?.toString() || '',", "        cost_price: costRow?.cost_price?.toString() || '',")
    patch("src/pages/admin/AdminProductFormPage.tsx", "      cost_price: formData.cost_price ? parseLocalizedNumber(formData.cost_price) || 0 : 0,\n", "")
    patch("src/pages/admin/AdminProductFormPage.tsx", '''        savedProductId = inserted.id;\n      }\n\n      // inventory_skus هو مصدر الحقيقة للمخزون.''', '''        savedProductId = inserted.id;\n      }\n\n      const secureCost = Math.max(0, formData.cost_price ? parseLocalizedNumber(formData.cost_price) || 0 : 0);\n      const { error: costError } = await (supabase as any)\n        .from('product_costs')\n        .upsert({ product_id: savedProductId, cost_price: secureCost, updated_at: new Date().toISOString() }, { onConflict: 'product_id' });\n      if (costError) throw costError;\n\n      // inventory_skus هو مصدر الحقيقة للمخزون.''')

    patch("src/pages/admin/AdminProductsPage.tsx", "  cost_price: number | null;\n", "")
    patch("src/pages/admin/AdminProductsPage.tsx", "id,name,name_ar,slug,price,cost_price,discount,category,category_id,brand,brand_id,in_stock,is_active,countries,images,color_variants,sort_order", "id,name,name_ar,slug,price,discount,category,category_id,brand,brand_id,in_stock,is_active,countries,images,color_variants,sort_order")
    patch("src/lib/admin/service.ts", "id,name,name_ar,slug,price,cost_price,discount,category,brand,in_stock,is_active,countries,images,sort_order,created_at", "id,name,name_ar,slug,price,discount,category,brand,in_stock,is_active,countries,images,sort_order,created_at")

    patch("src/pages/admin/reports/ReportsFinancePage.tsx", '      const { data, error } = await supabase.from("products").select("id,cost_price,price");', '      const { data, error } = await (supabase as any).from("products").select("id,price,product_costs(cost_price)");')
    patch("src/pages/admin/reports/ReportsFinancePage.tsx", '''        ...row,\n        cost_price: row.cost_price == null ? null : Number(row.cost_price),\n        price: Number(row.price || 0),''', '''        ...row,\n        cost_price: Number(Array.isArray(row.product_costs) ? row.product_costs[0]?.cost_price || 0 : row.product_costs?.cost_price || 0),\n        price: Number(row.price || 0),''')

    patch("src/pages/admin/AdminInventoryAdjustmentsPage.tsx", '      let query = supabase.from("products").select("id,name,name_ar,brand,cost_price,price,stock_quantity,in_stock,is_active,images,color_variants,has_sizes,sizes,has_quality_variants", { count: "exact" });', '      let query = (supabase as any).from("products").select("id,name,name_ar,brand,price,stock_quantity,in_stock,is_active,images,color_variants,has_sizes,sizes,has_quality_variants,product_costs(cost_price)", { count: "exact" });')
    patch("src/pages/admin/AdminInventoryAdjustmentsPage.tsx", '      return { rows: (data || []) as Product[], total: count || 0 };', '''      const rows = (data || []).map((row: any) => ({\n        ...row,\n        cost_price: Number(Array.isArray(row.product_costs) ? row.product_costs[0]?.cost_price || 0 : row.product_costs?.cost_price || 0),\n      }));\n      return { rows: rows as Product[], total: count || 0 };''')

    patch("src/pages/SearchPage.tsx", "  cost_price?: number | string | null; discount: number | null; description: string | null; description_ar: string | null;", "  discount: number | null; description: string | null; description_ar: string | null;")
    patch("src/pages/SearchPage.tsx", "  costPrice: data.cost_price === null || data.cost_price === undefined ? undefined : Number(data.cost_price),\n", "")

    patch("src/components/admin/AdminLayout.tsx", '  { title: "تجربة عرض المنتج", section: "الكتالوج", url: "/admin/product-experience" },\n', "")
    patch("src/components/admin/AdminLayout.tsx", '  { title: "خريطة الواجهة", section: "واجهة المتجر", url: "/admin/storefront-map" },\n', "")
    patch("src/components/admin/AdminLayout.tsx", '  { match: "/admin/product-experience", title: "تجربة عرض المنتج", section: "الكتالوج", exact: true },\n', "")
    patch("src/components/admin/AdminLayout.tsx", '  { match: "/admin/storefront-map", title: "خريطة الواجهة", section: "واجهة المتجر", exact: true },\n', "")

    app = ROOT / "src/App.tsx"
    text = app.read_text(encoding="utf-8")
    pair = '            <Route path="/brands/:slug/sections/:sectionSlug" element={ <ProtectedRoute><BrandSectionPage /></ProtectedRoute> } />\n            <Route path="/brand/:slug/sections/:sectionSlug" element={ <ProtectedRoute><BrandSectionPage /></ProtectedRoute> } />'
    if text.count(pair) != 2:
        raise RuntimeError(f"Expected duplicated brand route pair twice, got {text.count(pair)}")
    first = text.find(pair)
    second = text.find(pair, first + len(pair))
    app.write_text(text[:second] + text[second + len(pair):], encoding="utf-8")

    wrong_migration = ROOT / "supabase/migrations/20260818104000_final_launch_blockers.sql"
    if wrong_migration.exists():
        wrong_migration.unlink()

    run("npm", "run", "build")

    workflow = ROOT / ".github/workflows/temp-final-launch-blockers.yml"
    if workflow.exists():
        workflow.unlink()
    Path(__file__).unlink()

    run("git", "add", "-A")
    run("git", "commit", "-m", "Fix final launch UI and admin cost reads")
    run("git", "push", "-u", "origin", branch)
    print("DONE: branch pushed successfully")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
