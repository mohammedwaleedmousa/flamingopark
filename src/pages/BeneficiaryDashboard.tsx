import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, subMonths, isWithinInterval, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, ShoppingCart, DollarSign, Percent, QrCode, Copy, LogOut, Share2, Calendar, Clock, CheckCircle, AlertCircle, Users, Eye, Bell } from "lucide-react";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface BeneficiaryVisit {
  id: string;
  visited_at: string;
  converted_to_order: boolean;
  visitor_info: string | null;
}

interface Beneficiary {
  id: string;
  name: string;
  code: string;
  commission_percentage: number;
  discount_percentage: number;
  is_active: boolean;
  phone: string | null;
  email: string | null;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  beneficiary_commission: number;
  created_at: string;
  status: string;
  customer_name: string;
  invoice_url: string | null;
}

const CONFIRMED_STATUSES = ["completed", "delivered"];

const BeneficiaryDashboard = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const queryClient = useQueryClient();

  // Check if logged in
  useEffect(() => {
    const storedCode = localStorage.getItem("beneficiary_code");
    if (!storedCode || storedCode.toUpperCase() !== code?.toUpperCase()) {
      navigate("/bene");
    }
  }, [code, navigate]);

  // Fetch beneficiary data
  const { data: beneficiary, isLoading: loadingBeneficiary, error } = useQuery({
    queryKey: ["beneficiary", code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("code", code?.toUpperCase())
        .maybeSingle();
      
      if (error) throw error;
      return data as Beneficiary | null;
    },
  });

  // Fetch orders for this beneficiary
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["beneficiary-orders", beneficiary?.id],
    queryFn: async () => {
      if (!beneficiary?.id) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, beneficiary_commission, created_at, status, customer_name, invoice_url")
        .eq("beneficiary_id", beneficiary.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!beneficiary?.id,
  });

  // Fetch visits for this beneficiary
  const { data: visits = [], isLoading: loadingVisits } = useQuery({
    queryKey: ["beneficiary-visits", beneficiary?.id],
    queryFn: async () => {
      if (!beneficiary?.id) return [];
      
      const { data, error } = await supabase
        .from("beneficiary_visits")
        .select("id, visited_at, converted_to_order, visitor_info")
        .eq("beneficiary_id", beneficiary.id)
        .order("visited_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as BeneficiaryVisit[];
    },
    enabled: !!beneficiary?.id,
  });

  // Subscribe to realtime visits
  useEffect(() => {
    if (!beneficiary?.id) return;

    const channel = supabase
      .channel(`beneficiary-visits-${beneficiary.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'beneficiary_visits',
          filter: `beneficiary_id=eq.${beneficiary.id}`,
        },
        (payload) => {
          console.log('New visit received:', payload);
          // Show toast notification
          toast.success("🎉 عميل جديد دخل من رابطك!", {
            description: "عميل محتمل يتصفح المتجر الآن",
            duration: 5000,
          });
          // Refresh visits data
          queryClient.invalidateQueries({ queryKey: ["beneficiary-visits", beneficiary.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [beneficiary?.id, queryClient]);

  // Today's visits count
  const todayVisits = visits.filter(v => {
    const visitDate = new Date(v.visited_at);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  }).length;

  // Calculate stats - ONLY for confirmed orders with invoice
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 6 }); // Saturday
  const weekEnd = endOfWeek(now, { weekStartsOn: 6 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Filter confirmed orders (with invoice)
  const confirmedOrders = orders.filter(order => 
    CONFIRMED_STATUSES.includes(order.status) && order.invoice_url
  );
  
  // Pending orders (not yet confirmed or no invoice)
  const pendingOrders = orders.filter(order => 
    !CONFIRMED_STATUSES.includes(order.status) || !order.invoice_url
  );

  // Weekly stats
  const weeklyOrders = confirmedOrders.filter(order => 
    isWithinInterval(new Date(order.created_at), { start: weekStart, end: weekEnd })
  );
  
  // Monthly stats
  const monthlyOrders = confirmedOrders.filter(order => 
    isWithinInterval(new Date(order.created_at), { start: monthStart, end: monthEnd })
  );
  
  // Last month stats
  const lastMonthOrders = confirmedOrders.filter(order => 
    isWithinInterval(new Date(order.created_at), { start: lastMonthStart, end: lastMonthEnd })
  );

  const stats = {
    // Confirmed stats
    totalSales: confirmedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    totalCommission: confirmedOrders.reduce((sum, order) => sum + Number(order.beneficiary_commission || 0), 0),
    confirmedOrdersCount: confirmedOrders.length,
    // Pending stats
    pendingSales: pendingOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    pendingCommission: pendingOrders.reduce((sum, order) => sum + Number(order.beneficiary_commission || 0), 0),
    pendingOrdersCount: pendingOrders.length,
    // Weekly
    weeklySales: weeklyOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    weeklyCommission: weeklyOrders.reduce((sum, order) => sum + Number(order.beneficiary_commission || 0), 0),
    weeklyOrdersCount: weeklyOrders.length,
    // Monthly
    monthlySales: monthlyOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    monthlyCommission: monthlyOrders.reduce((sum, order) => sum + Number(order.beneficiary_commission || 0), 0),
    monthlyOrdersCount: monthlyOrders.length,
    // Last month
    lastMonthSales: lastMonthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    lastMonthCommission: lastMonthOrders.reduce((sum, order) => sum + Number(order.beneficiary_commission || 0), 0),
    lastMonthOrdersCount: lastMonthOrders.length,
  };

  const handleLogout = () => {
    localStorage.removeItem("beneficiary_code");
    navigate("/bene");
    toast.success("تم تسجيل الخروج بنجاح");
  };


  const handleCopyLink = () => {
    const link = `${window.location.origin}?ref=${beneficiary?.code}`;
    navigator.clipboard.writeText(link);
    toast.success("تم نسخ الرابط!");
  };

  const handleShare = async () => {
    const link = `${window.location.origin}?ref=${beneficiary?.code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "إرم للذهب - رابط خصم حصري",
          text: `ادخل من هذا الرابط للحصول على خصم ${beneficiary?.discount_percentage}%!`,
          url: link,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      handleCopyLink();
    }
  };

  if (loadingBeneficiary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !beneficiary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" dir="rtl">
        <Logo className="h-16 mb-6" />
        <h1 className="text-2xl font-bold text-destructive mb-2">كود غير صالح</h1>
        <p className="text-muted-foreground mb-4">لم يتم العثور على المستفيد بهذا الكود</p>
        <Button onClick={() => navigate("/bene")}>العودة لتسجيل الدخول</Button>
      </div>
    );
  }

  if (!beneficiary.is_active) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" dir="rtl">
        <Logo className="h-16 mb-6" />
        <h1 className="text-2xl font-bold text-destructive mb-2">الحساب غير نشط</h1>
        <p className="text-muted-foreground">هذا الحساب معطل حالياً، يرجى التواصل مع الإدارة</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Logo size="sm" className="h-8" />
            <div className="flex items-center gap-3">
              <div className="text-left">
                <p className="text-xs text-muted-foreground">مرحباً</p>
                <p className="font-bold">{beneficiary.name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* QR Code and Share Section */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl shadow-lg relative">
                <QRCodeSVG 
                  value={`${window.location.origin}?ref=${beneficiary.code}`}
                  size={150}
                  level="H"
                  includeMargin
                />
                {/* Center Logo/Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white px-2 py-1 rounded shadow-sm">
                    <span className="text-[10px] font-bold text-primary tracking-tight">ermgold</span>
                  </div>
                </div>
              </div>
              
              {/* Info and Actions */}
              <div className="flex-1 text-center md:text-right">
                <h2 className="text-xl font-bold mb-2">رابط الخصم الخاص بك</h2>
                <p className="text-muted-foreground mb-4">
                  شارك هذا الرابط أو الباركود مع عملائك ليحصلوا على خصم {beneficiary.discount_percentage}%
                </p>
                <p className="text-xs text-amber-600 mb-4">
                  ملاحظة: الخصم يطبق تلقائياً فقط عند دخول العميل من الرابط أو الباركود
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  <Button onClick={handleCopyLink} variant="outline">
                    <Copy className="h-4 w-4 ml-2" />
                    نسخ الرابط
                  </Button>
                  <Button onClick={handleShare}>
                    <Share2 className="h-4 w-4 ml-2" />
                    مشاركة
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Potential Customers (Visits) Section */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                العملاء المحتملين
              </span>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  <Eye className="h-3 w-3 ml-1" />
                  اليوم: {todayVisits}
                </Badge>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  الكل: {visits.length}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingVisits ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : visits.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد زيارات بعد. شارك رابطك لجذب العملاء!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {visits.slice(0, 10).map((visit) => (
                  <div key={visit.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">عميل محتمل</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(visit.visited_at), { addSuffix: true, locale: ar })}
                        </p>
                      </div>
                    </div>
                    {visit.converted_to_order ? (
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 ml-1" />
                        تم الشراء
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        <Eye className="h-3 w-3 ml-1" />
                        يتصفح
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Report Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="weekly">هذا الأسبوع</TabsTrigger>
            <TabsTrigger value="monthly">هذا الشهر</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Confirmed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">
                    المبيعات المؤكدة
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700">{stats.totalSales.toFixed(2)} ر.س</div>
                  <p className="text-xs text-green-600">{stats.confirmedOrdersCount} طلب مؤكد</p>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-700">
                    المبيعات المعلقة
                  </CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-700">{stats.pendingSales.toFixed(2)} ر.س</div>
                  <p className="text-xs text-yellow-600">{stats.pendingOrdersCount} طلب قيد الانتظار</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    نسبتك
                  </CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{beneficiary.commission_percentage}%</div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-primary">
                    أرباحك المؤكدة
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.totalCommission.toFixed(2)} ر.س</div>
                  <p className="text-xs text-muted-foreground">+ {stats.pendingCommission.toFixed(2)} معلق</p>
                </CardContent>
              </Card>
            </div>

            {/* Info Alert */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">كيف يتم احتساب الأرباح؟</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      يتم احتساب أرباحك فقط بعد إرسال الفاتورة للعميل عبر الواتساب وتأكيد الطلب.
                      الطلبات بدون فاتورة مرفقة ستظهر كمعلقة.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Weekly Tab */}
          <TabsContent value="weekly" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    مبيعات الأسبوع
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.weeklySales.toFixed(2)} ر.س</div>
                  <p className="text-xs text-muted-foreground">{stats.weeklyOrdersCount} طلب</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    عمولة الأسبوع
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.weeklyCommission.toFixed(2)} ر.س</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    الفترة
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {format(weekStart, "dd MMM", { locale: ar })} - {format(weekEnd, "dd MMM", { locale: ar })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* This Month */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    هذا الشهر ({format(monthStart, "MMMM yyyy", { locale: ar })})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المبيعات:</span>
                    <span className="font-bold">{stats.monthlySales.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">عدد الطلبات:</span>
                    <span className="font-bold">{stats.monthlyOrdersCount}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-primary font-medium">العمولة:</span>
                    <span className="font-bold text-primary">{stats.monthlyCommission.toFixed(2)} ر.س</span>
                  </div>
                </CardContent>
              </Card>

              {/* Last Month */}
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                    الشهر الماضي ({format(lastMonthStart, "MMMM yyyy", { locale: ar })})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المبيعات:</span>
                    <span className="font-bold">{stats.lastMonthSales.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">عدد الطلبات:</span>
                    <span className="font-bold">{stats.lastMonthOrdersCount}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground font-medium">العمولة:</span>
                    <span className="font-bold">{stats.lastMonthCommission.toFixed(2)} ر.س</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>سجل المبيعات</span>
              <div className="flex gap-2 text-sm font-normal">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  <CheckCircle className="h-3 w-3 ml-1" />
                  {stats.confirmedOrdersCount} مؤكد
                </Badge>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  <Clock className="h-3 w-3 ml-1" />
                  {stats.pendingOrdersCount} معلق
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد مبيعات بعد</p>
                <p className="text-sm">شارك رابطك الخاص لبدء الربح!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>قيمة الطلب</TableHead>
                      <TableHead>عمولتك</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const isConfirmed = CONFIRMED_STATUSES.includes(order.status) && order.invoice_url;
                      return (
                        <TableRow key={order.id} className={!isConfirmed ? "opacity-60" : ""}>
                          <TableCell className="font-mono">{order.order_number}</TableCell>
                          <TableCell>{order.customer_name}</TableCell>
                          <TableCell>{Number(order.total).toFixed(2)} ر.س</TableCell>
                          <TableCell className={isConfirmed ? "text-primary font-medium" : "text-muted-foreground"}>
                            {isConfirmed ? (
                              <>{Number(order.beneficiary_commission).toFixed(2)} ر.س</>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                معلق
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              order.status === "completed" || order.status === "delivered" ? "default" :
                              order.status === "pending" ? "secondary" :
                              order.status === "cancelled" ? "destructive" :
                              "outline"
                            }>
                              {order.status === "pending" ? "قيد الانتظار" :
                               order.status === "completed" ? "مكتمل" :
                               order.status === "cancelled" ? "ملغي" :
                               order.status === "processing" ? "قيد التنفيذ" :
                               order.status === "shipped" ? "تم الشحن" :
                               order.status === "delivered" ? "تم التوصيل" :
                               order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {order.invoice_url ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <CheckCircle className="h-3 w-3 ml-1" />
                                مرفقة
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-500">
                                غير مرفقة
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(order.created_at), "dd MMM yyyy", { locale: ar })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BeneficiaryDashboard;
