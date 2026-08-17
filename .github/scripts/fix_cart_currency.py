from pathlib import Path
p = Path('src/pages/CartPage.tsx')
text = p.read_text(encoding='utf-8')
old = '  const { format: formatCurrency } = useCurrency();'
new = '  const { format: formatCurrency, symbol: currency } = useCurrency();'
if text.count(old) != 1:
    raise RuntimeError(f'Expected one currency hook line, found {text.count(old)}')
p.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Cart currency reference fixed')
