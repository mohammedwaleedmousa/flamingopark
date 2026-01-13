import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, ShoppingCart, DollarSign, Percent } from "lucide-react";
import Logo from "@/components/Logo";

interface Beneficiary {
  id: string;
  name: string;
  code: string;
  commission_percentage: number;
  discount_percentage: number;
  is_active: boolean;
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

const BeneficiaryPage = () => {
  const { code } = useParams<{ code: string }>();

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
        <p className="text-muted-foreground">لم يتم العثور على المستفيد بهذا الكود</p>
      </div>
    );
  }

  if (!beneficiary.is_active) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4" dir="rtl">
        <Logo className="h-16 mb-6" />
        <h1 className="text-2xl font-bold text-destructive mb-2">الحساب غير نشط</h1>
        <p className="text-muted-foreground">هذا الحساب معطل حالياً</p>
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
            <div className="text-left">
              <p className="text-sm text-muted-foreground">مرحباً</p>
              <p className="font-bold">{beneficiary.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
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
              <div className="text-2xl font-bold">{stats.totalSales.toFixed(2)}</div>
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
              <div className="text-2xl font-bold text-primary">{stats.totalCommission.toFixed(2)}</div>
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
                لا توجد مبيعات بعد
              </div>
            ) : (
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
                      <TableCell>{Number(order.total).toFixed(2)}</TableCell>
                      <TableCell className="text-primary font-medium">
                        {Number(order.beneficiary_commission).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          order.status === "completed" ? "default" :
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BeneficiaryPage;
