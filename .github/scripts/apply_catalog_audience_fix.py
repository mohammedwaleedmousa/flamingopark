from pathlib import Path

# ---------------- AdminProductFormPage ----------------
p = Path('src/pages/admin/AdminProductFormPage.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace("  is_active: boolean | null;\n}", "  is_active: boolean | null;\n  category_kind?: string | null;\n}", 1)
s = s.replace("    category: '',\n    brand: '',", "    category: '',\n    audience: '' as '' | 'men' | 'women' | 'kids' | 'unisex',\n    brand: '',", 1)
s = s.replace("      const { data, error } = await supabase\n        .from('categories')\n        .select('id, name, name_ar, slug, parent_id, is_active')", "      const { data, error } = await (supabase as any)\n        .from('categories')\n        .select('id, name, name_ar, slug, parent_id, is_active, category_kind')", 1)
s = s.replace("  const parentCategories = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);", "  const parentCategories = useMemo(() => categories.filter((c) => !c.parent_id && c.category_kind !== 'audience'), [categories]);", 1)
s = s.replace("    if (category.parent_id) {", "    if (category.category_kind === 'audience') {\n      setSelectedParentCategoryId('');\n      return;\n    }\n\n    if (category.parent_id) {", 1)
s = s.replace("        category: data.category || '',\n        brand: brandName,", "        category: data.category || '',\n        audience: ((data as any).audience || '') as '' | 'men' | 'women' | 'kids' | 'unisex',\n        brand: brandName,", 1)
s = s.replace("      !resolvedCategory && 'القسم الرئيسي',", "      !formData.audience && 'القسم',\n      !resolvedCategory && 'الفئة الرئيسية',", 1)
s = s.replace("      category_id: selectedCat?.id ?? null,\n      brand_id:", "      category_id: selectedCat?.id ?? null,\n      audience: formData.audience,\n      brand_id:", 1)
s = s.replace("        const { data: savedProduct, error } = await supabase\n          .from('products')", "        const { data: savedProduct, error } = await (supabase as any)\n          .from('products')", 1)
s = s.replace("        const { data: inserted, error } = await supabase\n          .from('products')", "        const { data: inserted, error } = await (supabase as any)\n          .from('products')", 1)
old = '''          <div className=\"grid grid-cols-1 gap-[10px] md:grid-cols-2\">\n            <div>\n              <label className=\"block text-[10px] font-medium text-[#6E7680] mb-[6px]\">القسم الرئيسي *</label>'''
new = '''          <div className=\"grid grid-cols-1 gap-[10px] md:grid-cols-3\">\n            <div>\n              <label className=\"block text-[10px] font-medium text-[#6E7680] mb-[6px]\">القسم *</label>\n              <Select value={formData.audience} onValueChange={(value) => setFormData((current) => ({ ...current, audience: value as 'men' | 'women' | 'kids' | 'unisex' }))}>\n                <SelectTrigger><SelectValue placeholder=\"اختر القسم\" /></SelectTrigger>\n                <SelectContent>\n                  <SelectItem value=\"men\">رجالي</SelectItem>\n                  <SelectItem value=\"women\">نسائي</SelectItem>\n                  <SelectItem value=\"kids\">أطفال</SelectItem>\n                  <SelectItem value=\"unisex\">للجنسين</SelectItem>\n                </SelectContent>\n              </Select>\n              <p className=\"text-[8px] text-[#969DA7] mt-[4px]\">يفصل منتجات الرجال والنساء حتى عند استخدام نفس الفئة.</p>\n            </div>\n\n            <div>\n              <label className=\"block text-[10px] font-medium text-[#6E7680] mb-[6px]\">الفئة الرئيسية *</label>'''
assert old in s, 'admin product category UI anchor missing'
s = s.replace(old, new, 1)
s = s.replace("                    category: value,", "                    category: category?.slug || '',", 1)
s = s.replace(">القسم الفرعي</label>", ">الفئة الفرعية</label>", 1)
s = s.replace("placeholder={subCategoriesForSelectedParent.length ? 'اختر القسم الفرعي' : 'لا توجد أقسام فرعية'}", "placeholder={subCategoriesForSelectedParent.length ? 'اختر الفئة الفرعية' : 'لا توجد فئات فرعية'}", 1)
s = s.replace("إذا لم توجد أقسام فرعية سيتم حفظ المنتج مباشرة داخل القسم الرئيسي.", "إذا لم توجد فئات فرعية سيتم حفظ المنتج مباشرة داخل الفئة الرئيسية.", 1)
p.write_text(s, encoding='utf-8')

# ---------------- CategoriesPage ----------------
p = Path('src/pages/CategoriesPage.tsx')
s = p.read_text(encoding='utf-8')
s = s.replace("  sort_order: number;\n}", "  sort_order: number;\n  category_kind?: string | null;\n}", 1)
s = s.replace('  const parentSlug = searchParams.get("parent") || "";', '  const audienceSlug = searchParams.get("audience") || "";\n  const parentSlug = searchParams.get("parent") || "";', 1)
s = s.replace('const { data, error } = await supabase.from("categories").select("id,slug,name,name_ar,parent_id,image_url,sort_order")', 'const { data, error } = await (supabase as any).from("categories").select("id,slug,name,name_ar,parent_id,image_url,sort_order,category_kind")', 1)
s = s.replace('  const parents = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);\n\n  const selectedParent = useMemo(() => parents.find((parent) => parent.slug === parentSlug) || null, [parents, parentSlug]);', '''  const audienceCategories = useMemo(() => categories.filter((category) => category.category_kind === "audience"), [categories]);\n  const catalogCategories = useMemo(() => categories.filter((category) => category.category_kind !== "audience"), [categories]);\n  const legacyAudience = useMemo(() => audienceCategories.find((category) => category.slug === parentSlug) || null, [audienceCategories, parentSlug]);\n  const selectedAudience = useMemo(() => audienceCategories.find((category) => category.slug === (audienceSlug || legacyAudience?.slug)) || null, [audienceCategories, audienceSlug, legacyAudience?.slug]);\n  const parents = useMemo(() => catalogCategories.filter((category) => !category.parent_id), [catalogCategories]);\n\n  const selectedParent = useMemo(() => parents.find((parent) => parent.slug === parentSlug) || null, [parents, parentSlug]);''', 1)
s = s.replace('    return categories.filter((category) => category.parent_id === selectedParent.id);', '    return catalogCategories.filter((category) => category.parent_id === selectedParent.id);', 1)
s = s.replace('  }, [categories, selectedParent]);', '  }, [catalogCategories, selectedParent]);', 1)
# Audience helpers after scopedCategoryIds
anchor = '''  const scopedCategoryIds = useMemo(() => {\n    if (!activeProductCategory) return [];\n\n    return [activeProductCategory.id];\n  }, [activeProductCategory]);\n'''
helper = anchor + '''\n  const audienceValues = useMemo(() => {\n    if (!selectedAudience) return [] as string[];\n    if (selectedAudience.slug === "men") return ["men", "unisex"];\n    if (selectedAudience.slug === "women") return ["women", "unisex"];\n    if (["kids", "babes"].includes(selectedAudience.slug)) return ["kids", "unisex"];\n    return ["unisex"];\n  }, [selectedAudience]);\n'''
assert anchor in s, 'scopedCategoryIds anchor missing'
s = s.replace(anchor, helper, 1)
# Add audience to scope key
s = s.replace('      scopedCategoryIds.join(","),\n      brandFilter,', '      selectedAudience?.slug || "",\n      scopedCategoryIds.join(","),\n      brandFilter,', 1)
s = s.replace('  }, [scopedCategoryIds, brandFilter, productQuery, productSort, inStockOnly, minPrice, maxPrice]);', '  }, [selectedAudience?.slug, scopedCategoryIds, brandFilter, productQuery, productSort, inStockOnly, minPrice, maxPrice]);', 1)
# Product queries: count + pages + brands
s = s.replace('let query = supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).in("category_id", scopedCategoryIds);', 'let query = (supabase as any).from("products").select("id", { count: "exact", head: true }).eq("is_active", true).in("category_id", scopedCategoryIds).in("audience", audienceValues);', 1)
s = s.replace('    enabled: scopedCategoryIds.length > 0,', '    enabled: scopedCategoryIds.length > 0 && audienceValues.length > 0,', 1)
s = s.replace('        let query = supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).in("category_id", scopedCategoryIds);', '        let query = (supabase as any).from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).in("category_id", scopedCategoryIds).in("audience", audienceValues);', 1)
s = s.replace('      enabled: scopedCategoryIds.length > 0,', '      enabled: scopedCategoryIds.length > 0 && audienceValues.length > 0,', 1)
s = s.replace('let query = supabase.from("products").select("brand").eq("is_active", true).in("category_id", scopedCategoryIds);', 'let query = (supabase as any).from("products").select("brand").eq("is_active", true).in("category_id", scopedCategoryIds).in("audience", audienceValues);', 1)
s = s.replace('    enabled: scopedCategoryIds.length > 0,\n    queryFn: async () => {\n      const brands', '    enabled: scopedCategoryIds.length > 0 && audienceValues.length > 0,\n    queryFn: async () => {\n      const brands', 1)
# Brand scope key include audience
s = s.replace('const brandScopeKey = useMemo(() => [scopedCategoryIds.join(","), productQuery,', 'const brandScopeKey = useMemo(() => [selectedAudience?.slug || "", scopedCategoryIds.join(","), productQuery,', 1)
s = s.replace('}, [scopedCategoryIds, productQuery, inStockOnly, minPrice, maxPrice]);', '}, [selectedAudience?.slug, scopedCategoryIds, productQuery, inStockOnly, minPrice, maxPrice]);', 1)
# Root intro condition
s = s.replace('{!selectedParent && (\n          <section className="border-b', '{!selectedAudience && !selectedParent && (\n          <section className="border-b', 1)
# Breadcrumb condition
s = s.replace('{selectedParent && (\n          <section className="border-b', '{selectedAudience && selectedParent && (\n          <section className="border-b', 1)
# Breadcrumb start button returns category list inside audience
s = s.replace('onClick={() => setStepParams({ parent: null, sub: null, brand: null })}', 'onClick={() => setStepParams({ audience: selectedAudience?.slug || null, parent: null, sub: null, brand: null })}', 1)
# Root cards should be audience cards
s = s.replace('{!selectedParent && (\n          <section className="mx-auto w-full max-w-[1500px] px-2.5 pb-8 pt-3 md:px-6 md:pb-12 md:pt-6">', '{!selectedAudience && !selectedParent && (\n          <section className="mx-auto w-full max-w-[1500px] px-2.5 pb-8 pt-3 md:px-6 md:pb-12 md:pt-6">', 1)
s = s.replace('{parents.map((category, index) => (\n                  <Link key={category.id} to={`/categories?parent=${category.slug}`}', '{audienceCategories.map((category, index) => (\n                  <Link key={category.id} to={`/categories?audience=${category.slug}`}', 1)
# Insert catalog roots for selected audience before SUB CATEGORIES comment
marker = '''        {/* =========================================================\n            SUB CATEGORIES\n        ========================================================= */}\n'''
catalog = '''        {selectedAudience && !selectedParent && (\n          <section className="mx-auto w-full max-w-[1500px] px-2.5 pb-9 pt-4 md:px-6 md:pb-12 md:pt-6">\n            <div className="mb-4 px-1">\n              <p className="text-[8px] text-[#9C8D88]">القسم</p>\n              <h1 className="mt-1 text-[22px] font-semibold text-[#403132]">{selectedAudience.name_ar}</h1>\n              <p className="mt-1 text-[8px] text-[#9C8D88]">اختر الفئة — المنتجات للجنسين تظهر ضمن هذا القسم تلقائيًا.</p>\n            </div>\n            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-5">\n              {parents.map((category, index) => (\n                <Link key={category.id} to={`/categories?audience=${selectedAudience.slug}&parent=${category.slug}`} className="group overflow-hidden rounded-[16px] border border-[#EEE5E1] bg-white">\n                  <div className="aspect-square overflow-hidden bg-[#F4F1EF]">\n                    <img src={category.image_url || FALLBACK[category.slug] || FALLBACK.women} alt={category.name_ar} loading={index < 2 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover md:transition-transform md:duration-300 md:group-hover:scale-[1.02]" />\n                  </div>\n                  <div className="flex min-h-[52px] items-center justify-between gap-2 px-3 py-2.5">\n                    <h2 className="truncate text-[11px] font-semibold text-[#453937] md:text-[13px]">{category.name_ar}</h2>\n                    <ChevronLeft className="h-3.5 w-3.5 shrink-0 stroke-[1.5] text-[#C96F79]" />\n                  </div>\n                </Link>\n              ))}\n            </div>\n          </section>\n        )}\n\n'''
assert marker in s, 'sub categories marker missing'
s = s.replace(marker, catalog + marker, 1)
# Preserve audience in sub links
s = s.replace('to={`/categories?parent=${selectedParent.slug}&sub=${category.slug}`}', 'to={`/categories?audience=${selectedAudience?.slug || ""}&parent=${selectedParent.slug}&sub=${category.slug}`}', 1)
# Show sub categories only with audience
s = s.replace('{selectedParent && !selectedSub && subCategories.length > 0 && (', '{selectedAudience && selectedParent && !selectedSub && subCategories.length > 0 && (', 1)
# Products only if audience selected
s = s.replace('{!!activeProductCategory && (', '{selectedAudience && !!activeProductCategory && (', 1)
p.write_text(s, encoding='utf-8')

# ---------------- migration ----------------
m = Path('supabase/migrations/20260817160000_add_product_audience_and_catalog_sections.sql')
m.write_text('''alter table public.products add column if not exists audience text;\n\ndo $$ begin\n  if not exists (select 1 from pg_constraint where conname = 'products_audience_check') then\n    alter table public.products add constraint products_audience_check check (audience is null or audience in ('men','women','kids','unisex'));\n  end if;\nend $$;\n\nalter table public.categories add column if not exists category_kind text not null default 'category';\n\ndo $$ begin\n  if not exists (select 1 from pg_constraint where conname = 'categories_category_kind_check') then\n    alter table public.categories add constraint categories_category_kind_check check (category_kind in ('category','audience'));\n  end if;\nend $$;\n\nupdate public.categories set category_kind='audience' where slug in ('men','women','babes','kids','unisex');\n\ninsert into public.categories(name,name_ar,slug,parent_id,is_active,sort_order,countries,category_kind)\nselect 'Unisex','للجنسين','unisex',null,true,28,array['GLOBAL']::text[],'audience'\nwhere not exists (select 1 from public.categories where slug='unisex');\n\nupdate public.categories set name='Kids', name_ar='أطفال', slug='kids', category_kind='audience' where slug='babes';\n\nupdate public.products p set audience='men' from public.categories c where p.category_id=c.id and c.slug='men' and p.audience is null;\nupdate public.products p set audience='women' from public.categories c where p.category_id=c.id and c.slug='women' and p.audience is null;\nupdate public.products p set audience='kids' from public.categories c where p.category_id=c.id and c.slug in ('kids','babes') and p.audience is null;\n\ncreate index if not exists idx_products_audience_active_category on public.products(audience,category_id) where is_active=true;\n''', encoding='utf-8')
print('catalog audience fix applied')
