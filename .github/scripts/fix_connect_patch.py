from pathlib import Path

p = Path('.github/scripts/connect_admin_storefront.py')
s = p.read_text(encoding='utf-8')
old = '''# Home page: import managed sections, remove the two duplicate product blocks, insert managed sections.
replace_once("src/pages/HomePage.tsx", 'import FlamingoServices from "@/components/FlamingoServices";', 'import FlamingoServices from "@/components/FlamingoServices";\\nimport HomeManagedSections from "@/components/HomeManagedSections";')
regex_once("src/pages/HomePage.tsx", r'\\n\\s*\\{showHomeSection\\("featuredProducts"\\) && \\(.*?\\n\\s*\\)\\}\\n\\n\\s*/\\* =====================================================\\n\\s*SERVICES', '\\n\\n        <HomeManagedSections />\\n\\n        {/* =====================================================\\n            SERVICES')
regex_once("src/pages/HomePage.tsx", r'\\n\\s*/\\* =====================================================\\n\\s*BEST SELLERS.*?\\n\\s*\\)\\}\\n\\n\\s*/\\* =====================================================\\n\\s*EDITORIAL', '\\n\\n        {/* =====================================================\\n            EDITORIAL')
'''
new = '''# Home page: import managed sections, disable duplicate legacy product blocks, insert managed sections.
replace_once("src/pages/HomePage.tsx", 'import FlamingoServices from "@/components/FlamingoServices";', 'import FlamingoServices from "@/components/FlamingoServices";\\nimport HomeManagedSections from "@/components/HomeManagedSections";')
replace_once("src/pages/HomePage.tsx", '{showHomeSection("featuredProducts") && (', '{false && showHomeSection("featuredProducts") && (')
replace_once("src/pages/HomePage.tsx", '{showHomeSection("bestSellers") && (', '{false && showHomeSection("bestSellers") && (')
replace_once("src/pages/HomePage.tsx", '        {/* =====================================================\\n            SERVICES', '        <HomeManagedSections />\\n\\n        {/* =====================================================\\n            SERVICES')
'''
if old not in s:
    raise SystemExit('home patch block not found')
p.write_text(s.replace(old, new, 1), encoding='utf-8')
print('home patch matching fixed')
