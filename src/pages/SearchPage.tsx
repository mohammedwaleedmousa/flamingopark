import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCT_CARD_SELECT } from '@/lib/productCardData';
import { Product } from '@/store/useStore';

const PAGE_SIZE = 24;

type SearchProductRow = {
  id: string;
  name: string | null;
  name_ar: string | null;
  slug: string;
  price: number | string;
  discount: number | null;
  description: string | null;
  description_ar: string | null;
  images: string[] | null;
  color_variants: { images?: string[] }[] | null;
  category: string | null;
  brand: string | null;
  in_stock: boolean | null;
  countries: string[] | null;
  is_best_seller: boolean | null;
  is_featured: boolean | null;
};

const convertToProduct = (data: SearchProductRow): Product => ({
  id: data.id,
  name: data.name || '',
  nameAr: data.name_ar || '',
  slug: data.slug || '',
  price: Number(data.price) || 0,
  discount: data.discount,
  description: data.description || '',
  descriptionAr: data.description_ar || '',
  images: data.images?.length ? data.images : (data.color_variants?.[0]?.images || []),
  category: data.category || '',
  brand: data.brand || '',
  inStock: Boolean(data.in_stock),
  countries: data.countries,
  isBestSeller: data.is_best_seller,
  isFeatured: data.is_featured,
});

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(query);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setInputValue(query);
    setPage(1);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ['search-products-v2', query, page],
    queryFn: async () => {
      const clean = query.trim();
      if (!clean) return { products: [] as Product[], total: 0 };

      const offset = (page - 1) * PAGE_SIZE;
      const { data: matches, error: matchError } = await (supabase as any).rpc('search_storefront_product_ids', {
        p_query: clean,
        p_offset: offset,
        p_limit: PAGE_SIZE,
      });
      if (matchError) throw matchError;

      const rows = matches || [];
      const ids = rows.map((row: any) => row.product_id).filter(Boolean);
      const total = Number(rows[0]?.total_count || 0);
      if (ids.length === 0) return { products: [] as Product[], total };

      const { data: productRows, error } = await supabase
        .from('products')
        .select(PRODUCT_CARD_SELECT)
        .in('id', ids)
        .eq('is_active', true);
      if (error) throw error;

      const byId = new Map((productRows || []).map((row: any) => [row.id, row]));
      const products = ids
        .map((id: string) => byId.get(id))
        .filter(Boolean)
        .map((row: any) => convertToProduct(row as SearchProductRow));

      return { products, total };
    },
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const submitSearch = () => {
    const clean = inputValue.trim();
    if (!clean) {
      setSearchParams({});
      return;
    }
    setSearchParams({ q: clean });
  };

  const pageNumbers = useMemo(() => {
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }, [page, totalPages]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-16 pt-24">
        <section className="border-b border-border bg-card/40">
          <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold md:text-2xl">البحث في المتجر</h1>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 shadow-sm">
                <Search className="mr-2 h-5 w-5 shrink-0 text-muted-foreground" />
                <input
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') submitSearch();
                  }}
                  placeholder="ابحث باسم المنتج أو الماركة مثل اديداس..."
                  className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
                />
                {inputValue && (
                  <button type="button" onClick={() => setInputValue('')} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={submitSearch} className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">
                  بحث
                </button>
              </div>

              {query && !isLoading && (
                <p className="mt-4 text-sm text-muted-foreground">
                  وجدنا <span className="font-semibold text-foreground">{total}</span> نتيجة لـ <span className="font-semibold text-primary">“{query}”</span>
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          {!query.trim() ? (
            <div className="py-20 text-center text-muted-foreground">اكتب اسم منتج أو ماركة لبدء البحث.</div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              جاري البحث...
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center">
              <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <h2 className="font-semibold">لم نجد نتائج</h2>
              <p className="mt-2 text-sm text-muted-foreground">جرّب اسم الماركة أو كلمة أبسط.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                {products.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => { setPage((current) => Math.max(1, current - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="h-9 rounded-lg border border-border px-4 text-sm disabled:opacity-40"
                  >
                    السابق
                  </button>
                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => { setPage(pageNumber); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`h-9 min-w-9 rounded-lg px-3 text-sm ${pageNumber === page ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => { setPage((current) => Math.min(totalPages, current + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="h-9 rounded-lg border border-border px-4 text-sm disabled:opacity-40"
                  >
                    التالي
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SearchPage;
