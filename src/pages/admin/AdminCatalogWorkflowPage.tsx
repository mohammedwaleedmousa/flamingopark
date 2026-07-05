import { Link } from 'react-router-dom';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Grid3X3, Link2, Package, Tag } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'أضف القسم الرئيسي والفرعي',
    description: 'مثال: نسائي ثم فساتين وبناطيل. عند إضافة قسم فرعي اختر القسم الأب.',
    href: '/admin/categories',
    icon: Grid3X3,
    action: 'فتح صفحة الفئات',
  },
  {
    id: 2,
    title: 'أضف الماركات',
    description: 'أضف اسم الماركة وشعارها فقط.',
    href: '/admin/brands',
    icon: Tag,
    action: 'فتح صفحة الماركات',
  },
  {
    id: 3,
    title: 'اربط الماركات بالأقسام',
    description: 'اختر لكل ماركة الأقسام التي يجب أن تظهر فيها داخل المتجر.',
    href: '/admin/brand-category-map',
    icon: Link2,
    action: 'فتح صفحة الربط',
  },
  {
    id: 4,
    title: 'أضف المنتجات واربطها فعلياً',
    description: 'عند إضافة المنتج اختر القسم الرئيسي ثم الفرعي ثم الماركة.',
    href: '/admin/products/new',
    icon: Package,
    action: 'إضافة منتج',
  },
];

const AdminCatalogWorkflowPage = () => {
  return (
    <div className="space-y-6 max-w-[1200px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="دليل العامل"
        title="طريقة العمل السريعة"
        description="4 خطوات فقط لتجهيز الأقسام والماركات والمنتجات بدون تعقيد"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.id} className="border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span>{step.title}</span>
                  <span className="h-7 min-w-7 px-2 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                    {step.id}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4 mt-0.5 text-primary" />
                  <p>{step.description}</p>
                </div>
                <Button asChild className="w-full justify-between">
                  <Link to={step.href}>
                    {step.action}
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          ملاحظة مهمة: لو القسم أو الماركة لا يظهران في واجهة المتجر، تأكد أن الحالة مفعلة وأنه يوجد منتجات مرتبطة فعلياً.
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCatalogWorkflowPage;
