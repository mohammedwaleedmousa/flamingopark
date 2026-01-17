import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, ExternalLink, Eye, QrCode, Download, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";

interface Beneficiary {
  id: string;
  name: string;
  code: string;
  phone?: string;
  commission_percentage: number;
  discount_percentage: number;
  sort_order: number;
  is_active: boolean;
  is_approved: boolean;
  created_at: string;
}

interface BeneficiaryStats {
  total_sales: number;
  total_commission: number;
  orders_count: number;
}

const AdminBeneficiariesPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [qrBeneficiary, setQrBeneficiary] = useState<Beneficiary | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    commission_percentage: 10,
    discount_percentage: 10,
    is_active: true,
  });

  // Fetch beneficiaries
  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ["beneficiaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return data as Beneficiary[];
    },
  });

  // Fetch stats for selected beneficiary
  const { data: beneficiaryStats } = useQuery({
    queryKey: ["beneficiary-stats", selectedBeneficiary?.id],
    queryFn: async () => {
      if (!selectedBeneficiary) return null;
      
      const { data, error } = await supabase
        .from("orders")
        .select("total, beneficiary_commission")
        .eq("beneficiary_id", selectedBeneficiary.id);
      
      if (error) throw error;
      
      const stats: BeneficiaryStats = {
        total_sales: data?.reduce((sum, order) => sum + Number(order.total || 0), 0) || 0,
        total_commission: data?.reduce((sum, order) => sum + Number(order.beneficiary_commission || 0), 0) || 0,
        orders_count: data?.length || 0,
      };
      
      return stats;
    },
    enabled: !!selectedBeneficiary,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("beneficiaries")
          .update({
            name: data.name,
            code: data.code.toUpperCase(),
            commission_percentage: data.commission_percentage,
            discount_percentage: data.discount_percentage,
            is_active: data.is_active,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const maxOrder = beneficiaries.length > 0 
          ? Math.max(...beneficiaries.map(b => b.sort_order)) + 1 
          : 0;
        
        const { error } = await supabase
          .from("beneficiaries")
          .insert({
            name: data.name,
            code: data.code.toUpperCase(),
            commission_percentage: data.commission_percentage,
            discount_percentage: data.discount_percentage,
            is_active: data.is_active,
            sort_order: maxOrder,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
      setIsDialogOpen(false);
      setEditingBeneficiary(null);
      resetForm();
      toast.success(editingBeneficiary ? "تم تحديث المستفيد بنجاح" : "تم إضافة المستفيد بنجاح");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("هذا الكود مستخدم بالفعل");
      } else {
        toast.error("حدث خطأ أثناء الحفظ");
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("beneficiaries")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
      toast.success("تم حذف المستفيد بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء الحذف");
    },
  });

  // Approve/Reject mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("beneficiaries")
        .update({ is_approved: approved, is_active: approved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
      toast.success(approved ? "تم قبول المستفيد بنجاح" : "تم رفض المستفيد");
    },
    onError: () => {
      toast.error("حدث خطأ");
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const currentIndex = beneficiaries.findIndex(b => b.id === id);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex < 0 || targetIndex >= beneficiaries.length) return;
      
      const current = beneficiaries[currentIndex];
      const target = beneficiaries[targetIndex];
      
      await supabase
        .from("beneficiaries")
        .update({ sort_order: target.sort_order })
        .eq("id", current.id);
      
      await supabase
        .from("beneficiaries")
        .update({ sort_order: current.sort_order })
        .eq("id", target.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["beneficiaries"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      commission_percentage: 10,
      discount_percentage: 10,
      is_active: true,
    });
  };

  const handleEdit = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary);
    setFormData({
      name: beneficiary.name,
      code: beneficiary.code,
      commission_percentage: beneficiary.commission_percentage,
      discount_percentage: beneficiary.discount_percentage,
      is_active: beneficiary.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingBeneficiary?.id,
    });
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("تم نسخ الرابط");
  };

  const viewBeneficiaryPage = (code: string) => {
    window.open(`/bene/${code}`, "_blank");
  };

  const handleViewStats = (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setIsStatsDialogOpen(true);
  };

  const handleViewQR = (beneficiary: Beneficiary) => {
    setQrBeneficiary(beneficiary);
    setIsQRDialogOpen(true);
  };

  const downloadQR = () => {
    if (!qrRef.current || !qrBeneficiary) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 500;
      if (ctx) {
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code centered
        ctx.drawImage(img, 50, 30, 300, 300);
        
        // Add text
        ctx.fillStyle = 'black';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(qrBeneficiary.name, canvas.width / 2, 370);
        
        ctx.font = '18px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(`كود: ${qrBeneficiary.code}`, canvas.width / 2, 400);
        ctx.fillText(`خصم ${qrBeneficiary.discount_percentage}%`, canvas.width / 2, 430);
        
        // Download
        const link = document.createElement('a');
        link.download = `qr-${qrBeneficiary.code}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    toast.success("تم تحميل الباركود");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المستفيدين</h1>
          <p className="text-muted-foreground">إدارة المستفيدين ونسب العمولات</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingBeneficiary(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              إضافة مستفيد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBeneficiary ? "تعديل المستفيد" : "إضافة مستفيد جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المستفيد</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="code">كود المستفيد</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="مثال: AHMED10"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  سيتم استخدام هذا الكود في الرابط الخاص بالمستفيد
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commission">نسبة العمولة %</Label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.commission_percentage}
                    onChange={(e) => setFormData({ ...formData, commission_percentage: Number(e.target.value) })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="discount">نسبة الخصم للعميل %</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">نشط</Label>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Dialog */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إحصائيات {selectedBeneficiary?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
                <p className="text-2xl font-bold">{beneficiaryStats?.total_sales?.toFixed(2) || 0}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">عدد الطلبات</p>
                <p className="text-2xl font-bold">{beneficiaryStats?.orders_count || 0}</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">إجمالي العمولة</p>
                <p className="text-2xl font-bold text-primary">{beneficiaryStats?.total_commission?.toFixed(2) || 0}</p>
              </div>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => viewBeneficiaryPage(selectedBeneficiary?.code || "")}>
                <ExternalLink className="h-4 w-4 ml-2" />
                فتح صفحة المستفيد
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">باركود المستفيد</DialogTitle>
          </DialogHeader>
          {qrBeneficiary && (
            <div className="space-y-4">
              <div 
                ref={qrRef}
                className="bg-white p-6 rounded-lg flex flex-col items-center"
              >
                <QRCodeSVG
                  value={`${window.location.origin}?ref=${qrBeneficiary.code}`}
                  size={200}
                  level="H"
                  includeMargin
                />
                <p className="mt-4 font-bold text-lg text-gray-900">{qrBeneficiary.name}</p>
                <p className="text-gray-600">كود: {qrBeneficiary.code}</p>
                <p className="text-primary font-medium">خصم {qrBeneficiary.discount_percentage}%</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => copyLink(qrBeneficiary.code)}
                >
                  <Copy className="h-4 w-4 ml-2" />
                  نسخ الرابط
                </Button>
                <Button 
                  className="flex-1"
                  onClick={downloadQR}
                >
                  <Download className="h-4 w-4 ml-2" />
                  تحميل الباركود
                </Button>
              </div>
              
              <p className="text-xs text-center text-muted-foreground">
                الرابط: {window.location.origin}?ref={qrBeneficiary.code}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Beneficiaries Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>الكود</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>نسبة العمولة</TableHead>
              <TableHead>نسبة الخصم</TableHead>
              <TableHead>الموافقة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الإضافة</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beneficiaries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  لا يوجد مستفيدين بعد
                </TableCell>
              </TableRow>
            ) : (
              beneficiaries.map((beneficiary, index) => (
                <TableRow key={beneficiary.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => reorderMutation.mutate({ id: beneficiary.id, direction: "up" })}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => reorderMutation.mutate({ id: beneficiary.id, direction: "down" })}
                          disabled={index === beneficiaries.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{beneficiary.name}</TableCell>
                  <TableCell>
                    <code className="bg-muted px-2 py-1 rounded text-sm">{beneficiary.code}</code>
                  </TableCell>
                  <TableCell>{beneficiary.phone || "-"}</TableCell>
                  <TableCell>{beneficiary.commission_percentage}%</TableCell>
                  <TableCell>{beneficiary.discount_percentage}%</TableCell>
                  <TableCell>
                    {beneficiary.is_approved ? (
                      <Badge className="bg-green-500 hover:bg-green-600 text-white">
                        <Check className="h-3 w-3 ml-1" />
                        مقبول
                      </Badge>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                          قيد المراجعة
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-7 px-2 bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => approveMutation.mutate({ id: beneficiary.id, approved: true })}
                          >
                            <Check className="h-3 w-3 ml-1" />
                            قبول
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2"
                            onClick={() => {
                              if (confirm("هل أنت متأكد من رفض هذا المستفيد؟ سيتم حذفه نهائياً.")) {
                                deleteMutation.mutate(beneficiary.id);
                              }
                            }}
                          >
                            <X className="h-3 w-3 ml-1" />
                            رفض
                          </Button>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      beneficiary.is_active 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {beneficiary.is_active ? "نشط" : "غير نشط"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(beneficiary.created_at), "dd MMM yyyy", { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewStats(beneficiary)}
                        title="عرض الإحصائيات"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewQR(beneficiary)}
                        title="عرض الباركود"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyLink(beneficiary.code)}
                        title="نسخ الرابط"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => viewBeneficiaryPage(beneficiary.code)}
                        title="فتح صفحة المستفيد"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(beneficiary)}
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("هل أنت متأكد من حذف هذا المستفيد؟")) {
                            deleteMutation.mutate(beneficiary.id);
                          }
                        }}
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminBeneficiariesPage;
