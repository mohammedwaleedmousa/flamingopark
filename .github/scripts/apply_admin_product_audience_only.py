from pathlib import Path

# ---------------- Admin product form ----------------
p = Path('src/pages/admin/AdminProductFormPage.tsx')
s = p.read_text(encoding='utf-8')

s = s.replace("    category: '',\n    brand: '',", "    category: '',\n    audience: '' as '' | 'men' | 'women' | 'kids' | 'unisex',\n    brand: '',", 1)
s = s.replace("        category: data.category || '',\n        brand: brandName,", "        category: data.category || '',\n        audience: (((data as any).audience || '') as '' | 'men' | 'women' | 'kids' | 'unisex'),\n        brand: brandName,", 1)
s = s.replace("      price < 0 && 'سعر البيع',\n      !resolvedCategory && 'القسم الرئيسي',", "      price < 0 && 'سعر البيع',\n      !formData.audience && 'قسم الظهور',\n      !resolvedCategory && 'القسم الرئيسي',", 1)
s = s.replace("      category_id: selectedCat?.id ?? null,\n      brand_id:", "      category_id: selectedCat?.id ?? null,\n      audience: formData.audience,\n      brand_id:", 1)
s = s.replace("        const { data: savedProduct, error } = await supabase\n          .from('products')", "        const { data: savedProduct, error } = await (supabase as any)\n          .from('products')", 1)
s = s.replace("        const { data: inserted, error } = await supabase\n          .from('products')", "        const { data: inserted, error } = await (supabase as any)\n          .from('products')", 1)

old_ui = '''          <div className="grid grid-cols-1 gap-[10px] md:grid-cols-2">\n            <div>\n              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">القسم الرئيسي *</label>'''
new_ui = '''          <div className="grid grid-cols-1 gap-[10px] md:grid-cols-3">\n            <div>\n              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">قسم ظهور المنتج *</label>\n              <Select value={formData.audience} onValueChange={(value) => setFormData((current) => ({ ...current, audience: value as 'men' | 'women' | 'kids' | 'unisex' }))}>\n                <SelectTrigger><SelectValue placeholder="اختر أين يظهر المنتج" /></SelectTrigger>\n                <SelectContent>\n                  <SelectItem value="men">رجالي</SelectItem>\n                  <SelectItem value="women">نسائي</SelectItem>\n                  <SelectItem value="kids">أطفال</SelectItem>\n                  <SelectItem value="unisex">للجنسين</SelectItem>\n                </SelectContent>\n              </Select>\n              <p className="text-[8px] text-[#969DA7] mt-[4px]">لا يغيّر الفئة؛ يحدد فقط القسم الذي يظهر فيه المنتج للعميل.</p>\n            </div>\n\n            <div>\n              <label className="block text-[10px] font-medium text-[#6E7680] mb-[6px]">القسم الرئيسي *</label>'''
assert old_ui in s, 'admin category UI anchor missing'
s = s.replace(old_ui, new_ui, 1)
p.write_text(s, encoding='utf-8')

# ---------------- Customer categories logic only (no visual markup changes) ----------------
p = Path('src/pages/CategoriesPage.tsx')
s = p.read_text(encoding='utf-8')

sub_anchor = '''  const selectedSub = useMemo(() => subCategories.find((sub) => sub.slug === subSlug) || null, [subCategories, subSlug]);\n\n  const activeProductCategory = selectedSub || (selectedParent && subCategories.length === 0 ? selectedParent : null);\n'''
sub_new = '''  const selectedSub = useMemo(() => subCategories.find((sub) => sub.slug === subSlug) || null, [subCategories, subSlug]);\n\n  const audienceContext = useMemo(() => {\n    if (selectedParent?.slug === "men") return "men";\n    if (selectedParent?.slug === "women") return "women";\n    if (["babes", "kids"].includes(selectedParent?.slug || "")) return "kids";\n    return "";\n  }, [selectedParent?.slug]);\n\n  const audienceValues = useMemo(() => {\n    if (audienceContext === "men") return ["men", "unisex"];\n    if (audienceContext === "women") return ["women", "unisex"];\n    if (audienceContext === "kids") return ["kids"];\n    return [] as string[];\n  }, [audienceContext]);\n\n  const activeProductCategory = selectedSub || (selectedParent && subCategories.length === 0 ? selectedParent : null);\n'''
assert sub_anchor in s, 'selectedSub anchor missing'
s = s.replace(sub_anchor, sub_new, 1)

scope_anchor = '''  const scopedCategoryIds = useMemo(() => {\n    if (!activeProductCategory) return [];\n\n    return [activeProductCategory.id];\n  }, [activeProductCategory]);\n'''
scope_new = scope_anchor + '''\n  const audienceRootOnly = Boolean(audienceContext && selectedParent && !selectedSub && ["men", "women"].includes(selectedParent.slug));\n  const hasProductScope = audienceRootOnly || scopedCategoryIds.length > 0;\n'''
assert scope_anchor in s, 'scope anchor missing'
s = s.replace(scope_anchor, scope_new, 1)

s = s.replace('      scopedCategoryIds.join(","),\n      brandFilter,', '      audienceContext,\n      audienceRootOnly ? "audience-root" : scopedCategoryIds.join(","),\n      brandFilter,', 1)
s = s.replace('  }, [scopedCategoryIds, brandFilter, productQuery, productSort, inStockOnly, minPrice, maxPrice]);', '  }, [audienceContext, audienceRootOnly, scopedCategoryIds, brandFilter, productQuery, productSort, inStockOnly, minPrice, maxPrice]);', 1)

count_old = '      let query = supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).in("category_id", scopedCategoryIds);'
count_new = '''      let query = (supabase as any).from("products").select("id", { count: "exact", head: true }).eq("is_active", true);\n      if (!audienceRootOnly) query = query.in("category_id", scopedCategoryIds);\n      if (audienceValues.length > 0) query = query.in("audience", audienceValues);'''
assert count_old in s, 'count query anchor missing'
s = s.replace(count_old, count_new, 1)
s = s.replace('    enabled: scopedCategoryIds.length > 0,', '    enabled: hasProductScope,', 1)

products_old = '        let query = supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).in("category_id", scopedCategoryIds);'
products_new = '''        let query = (supabase as any).from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true);\n        if (!audienceRootOnly) query = query.in("category_id", scopedCategoryIds);\n        if (audienceValues.length > 0) query = query.in("audience", audienceValues);'''
assert products_old in s, 'products query anchor missing'
s = s.replace(products_old, products_new, 1)
s = s.replace('      enabled: scopedCategoryIds.length > 0,', '      enabled: hasProductScope,', 1)

s = s.replace('  const brandScopeKey = useMemo(() => [scopedCategoryIds.join(","), productQuery, inStockOnly ? "1" : "0", minPrice, maxPrice].join("|"), [scopedCategoryIds, productQuery, inStockOnly, minPrice, maxPrice]);', '  const brandScopeKey = useMemo(() => [audienceContext, audienceRootOnly ? "audience-root" : scopedCategoryIds.join(","), productQuery, inStockOnly ? "1" : "0", minPrice, maxPrice].join("|"), [audienceContext, audienceRootOnly, scopedCategoryIds, productQuery, inStockOnly, minPrice, maxPrice]);', 1)
s = s.replace('    enabled: scopedCategoryIds.length > 0,', '    enabled: hasProductScope,', 1)
brands_old = '        let query = supabase.from("products").select("brand").eq("is_active", true).in("category_id", scopedCategoryIds);'
brands_new = '''        let query = (supabase as any).from("products").select("brand").eq("is_active", true);\n        if (!audienceRootOnly) query = query.in("category_id", scopedCategoryIds);\n        if (audienceValues.length > 0) query = query.in("audience", audienceValues);'''
assert brands_old in s, 'brands query anchor missing'
s = s.replace(brands_old, brands_new, 1)
p.write_text(s, encoding='utf-8')

# ---------------- Migration ----------------
m = Path('supabase/migrations/20260817195000_add_product_audience_for_admin.sql')
m.write_text('''alter table public.products add column if not exists audience text;\n\ndo $$ begin\n  if not exists (select 1 from pg_constraint where conname = 'products_audience_check') then\n    alter table public.products add constraint products_audience_check check (audience is null or audience in ('men','women','kids','unisex'));\n  end if;\nend $$;\n\nupdate public.products p\nset audience = 'men'\nfrom public.categories c\nwhere p.category_id = c.id and c.slug = 'men' and p.audience is null;\n\nupdate public.products p\nset audience = 'women'\nfrom public.categories c\nwhere p.category_id = c.id and c.slug = 'women' and p.audience is null;\n\nupdate public.products p\nset audience = 'kids'\nwhere p.audience is null\n  and p.category_id in (\n    select c.id from public.categories c\n    where c.slug = 'babes'\n       or c.parent_id = (select id from public.categories where slug = 'babes' limit 1)\n  );\n\ncreate index if not exists idx_products_audience_active\non public.products(audience)\nwhere is_active = true;\n''', encoding='utf-8')
