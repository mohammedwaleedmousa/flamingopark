from pathlib import Path

p = Path('src/pages/admin/AdminCategoriesPage.tsx')
s = p.read_text(encoding='utf-8')
old = '    return categories.filter((category) => {'
new = '    return catalogCategories.filter((category) => {'
if old not in s:
    raise RuntimeError('filtered categories anchor not found')
s = s.replace(old, new, 1)
old_deps = '  }, [categories, search, statusFilter, typeFilter]);'
new_deps = '  }, [catalogCategories, search, statusFilter, typeFilter]);'
if old_deps not in s:
    raise RuntimeError('filtered categories deps anchor not found')
s = s.replace(old_deps, new_deps, 1)
p.write_text(s, encoding='utf-8')
print('Final catalog audience cleanup applied')
