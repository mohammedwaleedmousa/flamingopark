import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Package, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type CountryType = 'SA' | 'YE';

interface Product {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  price: number;
  discount: number;
  category: string;
  brand: string;
  in_stock: boolean;
  is_active: boolean;
  countries: string[];
  images: string[];
  sort_order: number;
}

const AdminProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedCountry, setSelectedCountry] = useState<CountryType | null>(
    (searchParams.get('country') as CountryType) || null
  );

  useEffect(() => {
    if (selectedCountry) {
      fetchProducts();
    }
  }, [selectedCountry]);

  const handleCountryChange = (country: CountryType) => {
    setSelectedCountry(country);
    setSearchParams({ country });
  };

  const fetchProducts = async () => {
    if (!selectedCountry) return;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .contains('countries', [selectedCountry])
      .order('sort_order', { ascending: true });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل المنتجات', variant: 'destructive' });
    } else {
      setProducts(data || []);
    }
    setIsLoading(false);
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الحالة', variant: 'destructive' });
    } else {
      setProducts(products.map(p => p.id === id ? { ...p, is_active: !currentState } : p));
      toast({ title: 'تم', description: 'تم تحديث حالة المنتج' });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف المنتج', variant: 'destructive' });
    } else {
      setProducts(products.filter(p => p.id !== id));
      toast({ title: 'تم', description: 'تم حذف المنتج' });
    }
  };

  const updateSortOrder = async (id: string, newSortOrder: number) => {
    const { error } = await supabase
      .from('products')
      .update({ sort_order: newSortOrder })
      .eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الترتيب', variant: 'destructive' });
    } else {
      setProducts(products.map(p => p.id === id ? { ...p, sort_order: newSortOrder } : p));
      toast({ title: 'تم', description: 'تم تحديث الترتيب' });
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const sortedProducts = [...filteredProducts].sort((a, b) => a.sort_order - b.sort_order);
    const current = sortedProducts[index];
    const prev = sortedProducts[index - 1];
    
    // Swap sort orders
    await updateSortOrder(current.id, prev.sort_order);
    await updateSortOrder(prev.id, current.sort_order);
    fetchProducts();
  };

  const moveDown = async (index: number) => {
    const sortedProducts = [...filteredProducts].sort((a, b) => a.sort_order - b.sort_order);
    if (index === sortedProducts.length - 1) return;
    const current = sortedProducts[index];
    const next = sortedProducts[index + 1];
    
    // Swap sort orders
    await updateSortOrder(current.id, next.sort_order);
    await updateSortOrder(next.id, current.sort_order);
    fetchProducts();
  };

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name_ar.includes(search) || p.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || (filter === 'active' ? p.is_active : !p.is_active);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    inactive: products.filter(p => !p.is_active).length,
  };

  // Show country selection if no country is selected
  if (!selectedCountry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <div className="text-center">
          <h1 className="font-heading text-2xl md:text-3xl text-foreground mb-2">اختر البلد</h1>
          <p className="text-muted-foreground">اختر البلد لعرض وإدارة المنتجات</p>
        </div>
        <div className="flex gap-6">
          <button
            onClick={() => handleCountryChange('SA')}
            className="flex flex-col items-center gap-3 p-8 bg-card border-2 border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <span className="text-6xl">🇸🇦</span>
            <span className="font-heading text-lg text-foreground group-hover:text-primary transition-colors">السعودية</span>
          </button>
          <button
            onClick={() => handleCountryChange('YE')}
            className="flex flex-col items-center gap-3 p-8 bg-card border-2 border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <span className="text-6xl">🇾🇪</span>
            <span className="font-heading text-lg text-foreground group-hover:text-primary transition-colors">اليمن</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Country Selector */}
      <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
        <span className="text-sm text-muted-foreground">البلد:</span>
        <div className="flex gap-2">
          <button
            onClick={() => handleCountryChange('SA')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
              selectedCountry === 'SA'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            <span>🇸🇦</span>
            <span className="text-sm font-medium">السعودية</span>
          </button>
          <button
            onClick={() => handleCountryChange('YE')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
              selectedCountry === 'YE'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            <span>🇾🇪</span>
            <span className="text-sm font-medium">اليمن</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground">
            منتجات {selectedCountry === 'SA' ? '🇸🇦 السعودية' : '🇾🇪 اليمن'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{stats.total} منتج • {stats.active} نشط</p>
        </div>
        <Button asChild className="btn-gold gap-2 w-full sm:w-auto">
          <Link to={`/admin/products/new?country=${selectedCountry}`}>
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Link>
        </Button>
      </div>

      {/* Stats Cards - Mobile */}
      <div className="grid grid-cols-3 gap-3 md:hidden">
        {[
          { label: 'الكل', value: stats.total, filter: 'all' as const, color: 'bg-primary/10 text-primary' },
          { label: 'نشط', value: stats.active, filter: 'active' as const, color: 'bg-green-500/10 text-green-600' },
          { label: 'معطل', value: stats.inactive, filter: 'inactive' as const, color: 'bg-red-500/10 text-red-600' },
        ].map((stat) => (
          <button
            key={stat.filter}
            onClick={() => setFilter(stat.filter)}
            className={cn(
              "p-3 rounded-xl text-center transition-all",
              filter === stat.filter ? stat.color + ' ring-2 ring-offset-2 ring-current' : 'bg-card border border-border'
            )}
          >
            <p className="text-xl font-heading">{stat.value}</p>
            <p className="text-xs">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن منتج..."
            className="pr-10 bg-card"
            dir="rtl"
          />
        </div>
        <div className="hidden md:flex gap-2">
          {['all', 'active', 'inactive'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f as typeof filter)}
              className={filter === f ? 'btn-gold' : ''}
            >
              {f === 'all' ? 'الكل' : f === 'active' ? 'نشط' : 'معطل'}
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex gap-3">
              <img
                src={product.images?.[0] || '/placeholder.svg'}
                alt={product.name_ar}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-heading text-foreground truncate">{product.name_ar}</h3>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium shrink-0",
                    product.is_active 
                      ? 'bg-green-500/15 text-green-600 border border-green-500/30' 
                      : 'bg-red-500/15 text-red-600 border border-red-500/30'
                  )}>
                    {product.is_active ? 'نشط' : 'معطل'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-heading text-primary">{product.price} ر.س</span>
                  {product.discount > 0 && (
                    <span className="text-xs text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                      -{product.discount}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">ترتيب: {product.sort_order}</span>
                  <div className="flex gap-1">
                    {product.countries?.map(c => (
                      <span key={c} className="text-sm">
                        {c === 'SA' ? '🇸🇦' : '🇾🇪'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => moveUp(index)}
                disabled={index === 0}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => moveDown(index)}
                disabled={index === filteredProducts.length - 1}
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => toggleActive(product.id, product.is_active)}
              >
                {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {product.is_active ? 'تعطيل' : 'تفعيل'}
              </Button>
              <Button asChild size="sm" variant="outline" className="flex-1 gap-2">
                <Link to={`/admin/products/${product.id}`}>
                  <Edit className="w-4 h-4" />
                  تعديل
                </Link>
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => deleteProduct(product.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{isLoading ? 'جاري التحميل...' : 'لا توجد منتجات'}</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-4 font-heading text-sm">الترتيب</th>
                <th className="text-right p-4 font-heading text-sm">الصورة</th>
                <th className="text-right p-4 font-heading text-sm">المنتج</th>
                <th className="text-right p-4 font-heading text-sm">السعر</th>
                <th className="text-right p-4 font-heading text-sm">التصنيف</th>
                <th className="text-right p-4 font-heading text-sm">البلدان</th>
                <th className="text-right p-4 font-heading text-sm">الحالة</th>
                <th className="text-right p-4 font-heading text-sm">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr key={product.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-muted"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-mono w-8 text-center">{product.sort_order}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-muted"
                        onClick={() => moveDown(index)}
                        disabled={index === filteredProducts.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="p-4">
                    <img
                      src={product.images?.[0] || '/placeholder.svg'}
                      alt={product.name_ar}
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                  </td>
                  <td className="p-4">
                    <p className="font-heading text-foreground">{product.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{product.slug}</p>
                  </td>
                  <td className="p-4">
                    <span className="font-heading text-primary">{product.price} ر.س</span>
                    {product.discount > 0 && (
                      <span className="text-xs text-destructive mr-2 bg-destructive/10 px-1.5 py-0.5 rounded">
                        -{product.discount}%
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm">{product.category}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {product.countries?.map(c => (
                        <span key={c} className="text-sm bg-muted px-2 py-1 rounded-lg">
                          {c === 'SA' ? '🇸🇦' : '🇾🇪'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      product.is_active 
                        ? 'bg-green-500/15 text-green-600 border border-green-500/30' 
                        : 'bg-red-500/15 text-red-600 border border-red-500/30'
                    )}>
                      {product.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="hover:bg-muted"
                        onClick={() => toggleActive(product.id, product.is_active)}
                      >
                        {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button asChild size="icon" variant="ghost" className="hover:bg-muted">
                        <Link to={`/admin/products/${product.id}`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => deleteProduct(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{isLoading ? 'جاري التحميل...' : 'لا توجد منتجات'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminProductsPage;