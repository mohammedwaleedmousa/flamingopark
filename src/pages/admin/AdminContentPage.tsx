import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, FileText, Search } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface SiteContent {
  id: string;
  key: string;
  title: string;
  content: string;
  content_ar: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const AdminContentPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editedContent, setEditedContent] = useState<Record<string, { content: string; content_ar: string }>>({});

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['site-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .order('key');
      if (error) throw error;
      return data as SiteContent[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content, content_ar }: { id: string; content: string; content_ar: string }) => {
      const { error } = await supabase
        .from('site_content')
        .update({ content, content_ar })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-content'] });
      toast({ title: 'تم الحفظ', description: 'تم تحديث المحتوى بنجاح' });
    },
    onError: (error) => {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
      console.error(error);
    },
  });

  const handleContentChange = (key: string, field: 'content' | 'content_ar', value: string) => {
    setEditedContent(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleSave = (item: SiteContent) => {
    const edited = editedContent[item.key];
    updateMutation.mutate({
      id: item.id,
      content: edited?.content ?? item.content,
      content_ar: edited?.content_ar ?? item.content_ar,
    });
  };

  const getDisplayValue = (item: SiteContent, field: 'content' | 'content_ar') => {
    return editedContent[item.key]?.[field] ?? item[field];
  };

  const hasChanges = (item: SiteContent) => {
    const edited = editedContent[item.key];
    if (!edited) return false;
    return edited.content !== item.content || edited.content_ar !== item.content_ar;
  };

  const filteredContents = contents.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group contents by category
  const groupedContents = filteredContents.reduce((acc, item) => {
    const category = item.key.split('_')[0];
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, SiteContent[]>);

  const getCategoryTitle = (category: string) => {
    const titles: Record<string, string> = {
      about: 'صفحة من نحن',
      footer: 'الفوتر',
      contact: 'معلومات التواصل',
    };
    return titles[category] || category;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading text-foreground">إدارة المحتوى</h1>
          <p className="text-muted-foreground font-body mt-1">تعديل جميع النصوص الموجودة في المتجر</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="البحث في المحتوى..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Content Sections */}
      <Accordion type="multiple" defaultValue={Object.keys(groupedContents)} className="space-y-4">
        {Object.entries(groupedContents).map(([category, items]) => (
          <AccordionItem key={category} value={category} className="border border-border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted/80 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-heading text-lg">{getCategoryTitle(category)}</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {items.length} عنصر
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-heading flex items-center justify-between">
                      <span>{item.title}</span>
                      {hasChanges(item) && (
                        <span className="text-xs bg-orange-500/10 text-orange-500 px-2 py-1 rounded-full">
                          غير محفوظ
                        </span>
                      )}
                    </CardTitle>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">English</label>
                        {item.content.length > 100 ? (
                          <Textarea
                            value={getDisplayValue(item, 'content')}
                            onChange={(e) => handleContentChange(item.key, 'content', e.target.value)}
                            rows={4}
                            dir="ltr"
                          />
                        ) : (
                          <Input
                            value={getDisplayValue(item, 'content')}
                            onChange={(e) => handleContentChange(item.key, 'content', e.target.value)}
                            dir="ltr"
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">العربية</label>
                        {item.content_ar.length > 100 ? (
                          <Textarea
                            value={getDisplayValue(item, 'content_ar')}
                            onChange={(e) => handleContentChange(item.key, 'content_ar', e.target.value)}
                            rows={4}
                            dir="rtl"
                          />
                        ) : (
                          <Input
                            value={getDisplayValue(item, 'content_ar')}
                            onChange={(e) => handleContentChange(item.key, 'content_ar', e.target.value)}
                            dir="rtl"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleSave(item)}
                        disabled={!hasChanges(item) || updateMutation.isPending}
                        size="sm"
                        className="gap-2"
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        حفظ
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filteredContents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          لا توجد نتائج للبحث
        </div>
      )}
    </div>
  );
};

export default AdminContentPage;
