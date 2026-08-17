from pathlib import Path

p = Path('src/pages/admin/AdminCategoriesPage.tsx')
s = p.read_text(encoding='utf-8')

old_interface = '''  description_ar?: string | null;\n}'''
new_interface = '''  description_ar?: string | null;\n  category_kind?: string | null;\n}'''
if old_interface in s:
    s = s.replace(old_interface, new_interface, 1)

old_query = '''const { data, error } = await supabase.from("categories").select("id,name,name_ar,slug,parent_id,image_url,is_active,sort_order,countries,description_ar").order("sort_order", { ascending: true }).order("name_ar", { ascending: true });'''
new_query = '''const { data, error } = await (supabase as any).from("categories").select("id,name,name_ar,slug,parent_id,image_url,is_active,sort_order,countries,description_ar,category_kind").order("sort_order", { ascending: true }).order("name_ar", { ascending: true });'''
assert old_query in s, 'categories query anchor not found'
s = s.replace(old_query, new_query, 1)

anchor = '''  const rootCategories = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);\n\n  const childCategories = useMemo(() => categories.filter((category) => Boolean(category.parent_id)), [categories]);'''
replacement = '''  const catalogCategories = useMemo(() => categories.filter((category) => category.category_kind !== "audience"), [categories]);\n\n  const rootCategories = useMemo(() => catalogCategories.filter((category) => !category.parent_id), [catalogCategories]);\n\n  const childCategories = useMemo(() => catalogCategories.filter((category) => Boolean(category.parent_id)), [catalogCategories]);'''
assert anchor in s, 'derived categories anchor not found'
s = s.replace(anchor, replacement, 1)

s = s.replace('      total: categories.length,', '      total: catalogCategories.length,', 1)
s = s.replace('      active: categories.filter((category) => category.is_active).length,', '      active: catalogCategories.filter((category) => category.is_active).length,', 1)
s = s.replace('      inactive: categories.filter((category) => !category.is_active).length,', '      inactive: catalogCategories.filter((category) => !category.is_active).length,', 1)
s = s.replace('  }, [categories, rootCategories.length, childCategories.length]);', '  }, [catalogCategories, rootCategories.length, childCategories.length]);', 1)

p.write_text(s, encoding='utf-8')
