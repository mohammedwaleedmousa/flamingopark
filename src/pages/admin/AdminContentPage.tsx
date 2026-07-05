import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save, FileText, Search, Upload, Image, X } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
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
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: contents = [], isLoading, refetch: refetchContent } = useQuery({
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

  const isImageContent = (key: string) => {
    return key.toLowerCase().includes('image') || key.toLowerCase().includes('logo') || key.toLowerCase().includes('banner');
  };

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

  const handleImageUpload = async (item: SiteContent, file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'خطأ', description: 'يرجى اختيار ملف صورة', variant: 'destructive' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'خطأ', description: 'حجم الصورة يجب أن يكون أقل من 5MB', variant: 'destructive' });
      return;
    }

    setUploadingKey(item.key);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `content/${item.key}_${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('uploads')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      // Update both content and content_ar with the same image URL
      const { error: updateError } = await supabase
        .from('site_content')
        .update({ content: publicUrl, content_ar: publicUrl })
        .eq('id', item.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['site-content'] });
      toast({ title: 'تم الرفع', description: 'تم رفع الصورة بنجاح' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء رفع الصورة', variant: 'destructive' });
    } finally {
      setUploadingKey(null);
    }
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
      gold: 'الذهب والجودة',
      experience: 'الخبرة',
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
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="المحتوى"
        title="إدارة المحتوى"
        description="تعديل جميع النصوص والصور الموجودة في المتجر"
        actions={[
          {
            label: "تحديث",
            icon: Search,
            onClick: refetchContent,
            variant: "secondary",
          },
        ]}
      />

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
                      <div className="flex items-center gap-2">
                        {isImageContent(item.key) && <Image className="w-4 h-4 text-primary" />}
                        <span>{item.title}</span>
                      </div>
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
                    {isImageContent(item.key) ? (
                      // Image upload UI
                      <div className="space-y-4">
                        {/* Image Preview */}
                        {item.content_ar && (
                          <div className="relative w-full max-w-md mx-auto">
                            <img
                              src={item.content_ar}
                              alt={item.title}
                              className="w-full h-48 object-cover rounded-lg border border-border"
                            />
                          </div>
                        )}
                        
                        {/* Upload Button */}
                        <div className="flex flex-col items-center gap-3">
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => { fileInputRefs.current[item.key] = el; }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(item, file);
                            }}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRefs.current[item.key]?.click()}
                            disabled={uploadingKey === item.key}
                            className="gap-2"
                          >
                            {uploadingKey === item.key ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            {uploadingKey === item.key ? 'جاري الرفع...' : 'رفع صورة جديدة'}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            الحجم الأقصى: 5MB | الأنواع المدعومة: JPG, PNG, WEBP
                          </p>
                        </div>

                        {/* URL Input as fallback */}
                        <div className="pt-4 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">أو أدخل رابط الصورة مباشرة:</p>
                          <div className="flex gap-2">
                            <Input
                              value={getDisplayValue(item, 'content_ar')}
                              onChange={(e) => {
                                handleContentChange(item.key, 'content', e.target.value);
                                handleContentChange(item.key, 'content_ar', e.target.value);
                              }}
                              placeholder="https://..."
                              dir="ltr"
                              className="flex-1"
                            />
                            <Button
                              onClick={() => handleSave(item)}
                              disabled={!hasChanges(item) || updateMutation.isPending}
                              size="icon"
                            >
                              {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Text content UI
                      <>
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
                      </>
                    )}
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
