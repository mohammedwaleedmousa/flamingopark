import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, MapPin, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface CODRegion {
  id: string;
  country: string;
  region_name: string;
  region_name_ar: string;
  is_active: boolean;
}

const AdminCODRegionsPage = () => {
  const SINGLE_COUNTRY = 'GLOBAL';
  const [regions, setRegions] = useState<CODRegion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newRegion, setNewRegion] = useState({ country: SINGLE_COUNTRY, region_name: '', region_name_ar: '' });

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    const { data, error } = await supabase
      .from('cod_regions')
      .select('*')
      .order('region_name_ar', { ascending: true });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل المناطق', variant: 'destructive' });
    } else {
      setRegions(data || []);
    }
    setIsLoading(false);
  };

  const addRegion = async () => {
    if (!newRegion.region_name_ar.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم المنطقة', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('cod_regions').insert({
      country: newRegion.country,
      region_name: newRegion.region_name || newRegion.region_name_ar,
      region_name_ar: newRegion.region_name_ar,
    });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في إضافة المنطقة', variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تمت إضافة المنطقة بنجاح' });
      setNewRegion({ country: SINGLE_COUNTRY, region_name: '', region_name_ar: '' });
      fetchRegions();
    }
  };

  const deleteRegion = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المنطقة؟')) return;

    const { error } = await supabase.from('cod_regions').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف المنطقة', variant: 'destructive' });
    } else {
      setRegions(regions.filter(r => r.id !== id));
      toast({ title: 'تم', description: 'تم حذف المنطقة' });
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('cod_regions')
      .update({ is_active: !currentState })
      .eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الحالة', variant: 'destructive' });
    } else {
      setRegions(regions.map(r => r.id === id ? { ...r, is_active: !currentState } : r));
      toast({ title: 'تم', description: 'تم تحديث حالة المنطقة' });
    }
  };

  const filteredRegions = regions.filter(r => {
    const matchesSearch = r.region_name_ar.includes(search) || r.region_name.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: regions.length,
    active: regions.filter(r => r.is_active).length,
    inactive: regions.filter(r => !r.is_active).length,
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="الإدارة"
        title="مناطق الدفع عند الاستلام"
        description="إدارة المناطق المسموح فيها الدفع عند الاستلام"
        actions={[
          {
            label: "تحديث",
            icon: MapPin,
            onClick: fetchRegions,
            variant: "secondary",
          },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'إجمالي المناطق', value: stats.total },
          { label: 'مفعلة', value: stats.active },
          { label: 'معطلة', value: stats.inactive },
        ].map((stat) => (
          <div key={stat.label} className={cn("p-4 rounded-xl text-center transition-all border bg-card border-border")}>
            <p className="text-2xl font-heading">{stat.value}</p>
            <p className="text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Add New Region */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="font-heading text-lg text-foreground flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          إضافة منطقة جديدة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            value={newRegion.region_name_ar}
            onChange={(e) => setNewRegion({ ...newRegion, region_name_ar: e.target.value })}
            placeholder="اسم المنطقة (عربي)"
            dir="rtl"
          />
          <Input
            value={newRegion.region_name}
            onChange={(e) => setNewRegion({ ...newRegion, region_name: e.target.value })}
            placeholder="Region Name (English)"
          />
          <Button onClick={addRegion} className="btn-gold gap-2">
            <Plus className="w-4 h-4" />
            إضافة
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن منطقة..."
          className="pr-10 bg-card"
          dir="rtl"
        />
      </div>

      {/* Regions List */}
      <div className="space-y-3">
        {filteredRegions.map((region, index) => (
          <motion.div
            key={region.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-heading text-foreground">{region.region_name_ar}</p>
                <p className="text-xs text-muted-foreground">
                  {region.region_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={region.is_active ? 'default' : 'outline'}
                onClick={() => toggleActive(region.id, region.is_active)}
                className={region.is_active ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {region.is_active ? 'مفعّل' : 'معطّل'}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => deleteRegion(region.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
        {filteredRegions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{isLoading ? 'جاري التحميل...' : 'لا توجد مناطق'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCODRegionsPage;
