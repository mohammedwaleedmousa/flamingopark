from pathlib import Path

products = Path('src/pages/ProductsPage.tsx')
text = products.read_text(encoding='utf-8')

old_state = '''  /*
   * Metadata يبدأ بعد أول Paint بقليل.
   * هذا يجعل أول Cards تظهر أسرع.
   */
  const [metadataWarm, setMetadataWarm] = useState(false);

'''
if old_state not in text:
    raise RuntimeError('metadataWarm state block not found')
text = text.replace(old_state, '', 1)

old_effect = '''  /* =========================================================
     WARM METADATA AFTER INITIAL PAINT
  ========================================================= */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMetadataWarm(true);
    }, 450);

    return () => window.clearTimeout(timer);
  }, []);

'''
if old_effect not in text:
    raise RuntimeError('metadata warm effect not found')
text = text.replace(old_effect, '', 1)

old_load = '  const shouldLoadMetadata = metadataWarm || filtersOpen || needsClientFiltering;'
new_load = '''  // Do not download metadata for the entire catalog during normal browsing.
  // It is only needed when the filter UI is opened or a client-side filter is active.
  const shouldLoadMetadata = filtersOpen || needsClientFiltering;'''
if old_load not in text:
    raise RuntimeError('shouldLoadMetadata line not found')
text = text.replace(old_load, new_load, 1)

products.write_text(text, encoding='utf-8')

card = Path('src/components/ProductCard.tsx')
text = card.read_text(encoding='utf-8')

import_anchor = 'import { optimizeImage } from "@/lib/imageUrl";\n'
import_line = 'import { prefetchProductDetailPage } from "@/lib/prefetchRoutes";\n'
if import_line not in text:
    if import_anchor not in text:
        raise RuntimeError('ProductCard import anchor not found')
    text = text.replace(import_anchor, import_anchor + import_line, 1)

old_link = '<Link to={`/product/${product.slug}`} dir="rtl" onClick={() => saveCatalogScroll(`${location.pathname}${location.search}`)} className="block w-full min-w-0">'
new_link = '<Link to={`/product/${product.slug}`} dir="rtl" onPointerEnter={() => void prefetchProductDetailPage()} onPointerDown={() => void prefetchProductDetailPage()} onFocus={() => void prefetchProductDetailPage()} onClick={() => saveCatalogScroll(`${location.pathname}${location.search}`)} className="block w-full min-w-0">'
if old_link not in text:
    raise RuntimeError('ProductCard Link anchor not found')
text = text.replace(old_link, new_link, 1)
card.write_text(text, encoding='utf-8')

helper = Path('src/lib/prefetchRoutes.ts')
helper.write_text('''let productDetailPagePromise: Promise<unknown> | null = null;

export const prefetchProductDetailPage = () => {
  if (!productDetailPagePromise) {
    productDetailPagePromise = import("@/pages/ProductDetailPage").catch((error) => {
      productDetailPagePromise = null;
      throw error;
    });
  }

  return productDetailPagePromise;
};
''', encoding='utf-8')

print('Optimized product navigation without touching auth files')
