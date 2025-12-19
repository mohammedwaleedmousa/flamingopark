import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Star, Check, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Review {
  id: string;
  customer_name: string;
  message: string;
  message_ar: string | null;
  rating: number;
  country: string;
  is_approved: boolean | null;
  created_at: string;
}

const AdminReviewsPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [formData, setFormData] = useState({
    customer_name: "",
    message: "",
    message_ar: "",
    rating: 5,
    country: "SA",
    is_approved: false,
  });

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("reviews")
          .update({
            customer_name: data.customer_name,
            message: data.message,
            message_ar: data.message_ar || null,
            rating: data.rating,
            country: data.country,
            is_approved: data.is_approved,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").insert({
          customer_name: data.customer_name,
          message: data.message,
          message_ar: data.message_ar || null,
          rating: data.rating,
          country: data.country,
          is_approved: data.is_approved,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: editingReview ? "تم تحديث التقييم" : "تم إضافة التقييم" });
      resetForm();
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "تم حذف التقييم" });
    },
  });

  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_approved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "تم تحديث حالة التقييم" });
    },
  });

  const resetForm = () => {
    setFormData({
      customer_name: "",
      message: "",
      message_ar: "",
      rating: 5,
      country: "SA",
      is_approved: false,
    });
    setEditingReview(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setFormData({
      customer_name: review.customer_name,
      message: review.message,
      message_ar: review.message_ar || "",
      rating: review.rating,
      country: review.country,
      is_approved: review.is_approved ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      id: editingReview?.id,
    });
  };

  const filteredReviews = reviews?.filter((r) => {
    const countryMatch = filterCountry === "all" || r.country === filterCountry;
    const statusMatch =
      filterStatus === "all" ||
      (filterStatus === "approved" && r.is_approved === true) ||
      (filterStatus === "pending" && (r.is_approved === false || r.is_approved === null));

    return countryMatch && statusMatch;
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className={`w-4 h-4 ${star <= rating ? "fill-primary text-primary" : "text-muted"}`} />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-6 text-center">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة التقييمات</h1>
        <div className="flex gap-4">
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="الدولة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الدول</SelectItem>
              <SelectItem value="SA">السعودية 🇸🇦</SelectItem>
              <SelectItem value="YE">اليمن 🇾🇪</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
              <SelectItem value="pending">معلق</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة تقييم
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingReview ? "تعديل التقييم" : "إضافة تقييم جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>اسم العميل</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>التقييم (الإنجليزي)</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>التقييم (العربي)</Label>
                  <Textarea
                    value={formData.message_ar}
                    onChange={(e) => setFormData({ ...formData, message_ar: e.target.value })}
                    dir="rtl"
                  />
                </div>

                <div>
                  <Label>عدد النجوم</Label>
                  <Select
                    value={formData.rating.toString()}
                    onValueChange={(value) => setFormData({ ...formData, rating: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} نجوم
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>الدولة</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SA">السعودية 🇸🇦</SelectItem>
                      <SelectItem value="YE">اليمن 🇾🇪</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_approved}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_approved: checked })}
                  />
                  <Label>معتمد</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>العميل</TableHead>
            <TableHead>التقييم</TableHead>
            <TableHead>النجوم</TableHead>
            <TableHead>الدولة</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredReviews?.map((review) => (
            <TableRow key={review.id}>
              <TableCell className="font-medium">{review.customer_name}</TableCell>
              <TableCell className="max-w-xs truncate">{review.message_ar || review.message}</TableCell>
              <TableCell>{renderStars(review.rating)}</TableCell>
              <TableCell>{review.country === "SA" ? "🇸🇦" : "🇾🇪"}</TableCell>
              <TableCell>{format(new Date(review.created_at), "dd MMM yyyy", { locale: ar })}</TableCell>
              <TableCell>
                {review.is_approved ? (
                  <Badge variant="default" className="bg-green-600">
                    معتمد
                  </Badge>
                ) : (
                  <Badge variant="secondary">معلق</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {!review.is_approved && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600"
                      onClick={() =>
                        toggleApprovalMutation.mutate({
                          id: review.id,
                          is_approved: true,
                        })
                      }
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  {review.is_approved && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600"
                      onClick={() =>
                        toggleApprovalMutation.mutate({
                          id: review.id,
                          is_approved: false,
                        })
                      }
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleEdit(review)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(review.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AdminReviewsPage;
