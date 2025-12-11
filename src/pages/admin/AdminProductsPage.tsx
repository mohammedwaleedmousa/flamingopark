import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

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
}

const AdminProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

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

  const filteredProducts = products.filter(p =>
    p.name_ar.includes(search) || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-foreground">المنتجات</h1>
        <Button asChild className="btn-gold gap-2">
          <Link to="/admin/products/new">
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن منتج..."
          className="pr-10"
          dir="rtl"
        />
      </div>

      {/* Products Table */}
      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
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
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                  <td className="p-4">
                    <img
                      src={product.images?.[0] || '/placeholder.svg'}
                      alt={product.name_ar}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </td>
                  <td className="p-4">
                    <p className="font-heading text-foreground">{product.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{product.slug}</p>
                  </td>
                  <td className="p-4">
                    <span className="font-heading text-gold">${product.price}</span>
                    {product.discount > 0 && (
                      <span className="text-xs text-destructive mr-2">-{product.discount}%</span>
                    )}
                  </td>
                  <td className="p-4 text-sm">{product.category}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {product.countries?.map(c => (
                        <span key={c} className="text-xs bg-muted px-2 py-1 rounded">
                          {c === 'SA' ? '🇸🇦' : '🇾🇪'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      product.is_active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {product.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleActive(product.id, product.is_active)}
                      >
                        {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button asChild size="icon" variant="ghost">
                        <Link to={`/admin/products/${product.id}`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
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
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {isLoading ? 'جاري التحميل...' : 'لا توجد منتجات'}
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
