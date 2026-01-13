import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, ShoppingCart, DollarSign, Percent, QrCode, Copy, LogOut, Share2 } from "lucide-react";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

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
}

const BeneficiaryDashboard = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);

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
        .select("id, order_number, total, beneficiary_commission, created_at, status, customer_name")
        .eq("beneficiary_id", beneficiary.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!beneficiary?.id,
  });

  // Calculate stats
  const stats = {
    totalSales: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    totalCommission: orders.reduce((sum, order) => sum + Number(order.beneficiary_commission || 0), 0),
    ordersCount: orders.length,
  };

  const handleLogout = () => {
    localStorage.removeItem("beneficiary_code");
    navigate("/bene");
    toast.success("تم تسجيل الخروج بنجاح");
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(beneficiary?.code || "");
    toast.success("تم نسخ الكود!");
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
          title: "إرم للذهب - كود خصم",
          text: `استخدم كود الخصم ${beneficiary?.code} للحصول على ${beneficiary?.discount_percentage}% خصم!`,
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo className="h-10" />
            <div className="flex items-center gap-4">
              <div className="text-left">
                <p className="text-sm text-muted-foreground">مرحباً</p>
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
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <QRCodeSVG 
                  value={`${window.location.origin}?ref=${beneficiary.code}`}
                  size={150}
                  level="H"
                  includeMargin
                />
              </div>
              
              {/* Info and Actions */}
              <div className="flex-1 text-center md:text-right">
                <h2 className="text-xl font-bold mb-2">كود الخصم الخاص بك</h2>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                  <span className="text-3xl font-bold text-primary font-mono">{beneficiary.code}</span>
                  <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-muted-foreground mb-4">
                  شارك هذا الكود مع عملائك ليحصلوا على خصم {beneficiary.discount_percentage}%
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي المبيعات
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSales.toFixed(2)} ر.س</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                عدد الطلبات
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ordersCount}</div>
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
                إجمالي أرباحك
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalCommission.toFixed(2)} ر.س</div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>سجل المبيعات</CardTitle>
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
                <p className="text-sm">شارك كود الخصم الخاص بك لبدء الربح!</p>
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
                      <TableHead>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.order_number}</TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{Number(order.total).toFixed(2)} ر.س</TableCell>
                        <TableCell className="text-primary font-medium">
                          {Number(order.beneficiary_commission).toFixed(2)} ر.س
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
                          {format(new Date(order.created_at), "dd MMM yyyy", { locale: ar })}
                        </TableCell>
                      </TableRow>
                    ))}
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
