import { ExternalLink, Eye, LayoutDashboard, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";

const surfaces = [
  { title: "الرئيسية", description: "البانر، الماركات، الأقسام والحملات.", customer: "/home", manage: "/admin/customer-experience", manageLabel: "إدارة الواجهة" },
  { title: "البانرات الرئيسية", description: "ثلاث شرائح رئيسية مع صورة ونص ورابط وجهة.", customer: "/home", manage: "/admin/banners", manageLabel: "إدارة البانرات" },
  { title: "الحملات والخدمات", description: "صفحات مستقلة للقصص والخدمات والمنتجات المختارة.", customer: "/campaigns/example", manage: "/admin/campaigns", manageLabel: "إدارة الحملات" },
  { title: "الكتالوج", description: "بحث وفلاتر وبطاقات المنتجات.", customer: "/products", manage: "/admin/products", manageLabel: "إدارة المنتجات" },
  { title: "صفحة المنتج", description: "صور، مواصفات، أسئلة، تقييمات ومنتجات مكملة.", customer: "/products", manage: "/admin/product-experience", manageLabel: "تجربة المنتج" },
  { title: "الماركات", description: "صفحات الماركات وأقسامها ومنتجاتها المخصصة.", customer: "/brands", manage: "/admin/brand-pages", manageLabel: "صفحات الماركات" },
  { title: "الطلب والدفع", description: "السلة، العنوان، الشحن، الدفع وتأكيد الطلب.", customer: "/checkout", manage: "/admin/payment-methods", manageLabel: "طرق الدفع" },
  { title: "الشحن والتتبع", description: "خيارات التوصيل ومتابعة الطلبات.", customer: "/my-shipments", manage: "/admin/delivery", manageLabel: "شركات التوصيل" },
  { title: "الحساب والرسائل", description: "المفضلة، الطلبات، الإشعارات وتواصل العملاء.", customer: "/account", manage: "/admin/customer-notifications", manageLabel: "إشعارات العملاء" },
  { title: "معلومات المتجر", description: "التواصل، الضمان، الشحن وسياسات الخدمة.", customer: "/store-info", manage: "/admin/settings", manageLabel: "إعدادات المتجر" },
];

const AdminStorefrontMapPage = () => <div className="mx-auto max-w-[1400px] space-y-6" dir="rtl"><AdminPageHeader category="تشغيل المتجر" title="رحلة العميل" description="خريطة موحدة تربط كل واجهة يراها العميل بإدارة المحتوى أو التشغيل الخاصة بها." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{surfaces.map((surface) => <article key={surface.title} className="flex min-h-52 flex-col border border-border bg-card p-5"><div className="mb-4 flex h-10 w-10 items-center justify-center bg-primary/10 text-primary"><LayoutDashboard className="h-5 w-5" /></div><h2 className="font-heading text-xl">{surface.title}</h2><p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">{surface.description}</p><div className="mt-5 flex gap-2"><Button asChild size="sm" variant="outline" className="gap-2"><a href={surface.customer} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" />معاينة</a></Button><Button asChild size="sm" className="gap-2"><Link to={surface.manage}><Settings2 className="h-4 w-4" />{surface.manageLabel}</Link></Button></div></article>)}</div><div className="border border-primary/20 bg-primary/5 p-5 text-sm text-muted-foreground"><p className="font-medium text-foreground">طريقة العمل</p><p className="mt-2 leading-7">ابدأ من بطاقة العميل، افتح المعاينة، ثم انتقل إلى إدارة المحتوى المقابلة. أي حملة أو خدمة جديدة تُنشأ من إدارة الحملات وتُربط بالبانر الرئيسي عبر حقل رابط الوجهة.</p></div></div>;

export default AdminStorefrontMapPage;