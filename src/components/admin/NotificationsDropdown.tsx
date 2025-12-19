import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, ShoppingBag, MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

interface NotificationCounts {
  pendingOrders: number;
  pendingReviews: number;
  pendingProductReviews: number;
}

const NotificationsDropdown = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<NotificationCounts>({
    pendingOrders: 0,
    pendingReviews: 0,
    pendingProductReviews: 0,
  });
  const [isOpen, setIsOpen] = useState(false);

  const fetchCounts = async () => {
    try {
      const [ordersRes, reviewsRes, productReviewsRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
      ]);

      setCounts({
        pendingOrders: ordersRes.count || 0,
        pendingReviews: reviewsRes.count || 0,
        pendingProductReviews: productReviewsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching notification counts:", error);
    }
  };

  useEffect(() => {
    fetchCounts();
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh when popover opens
  useEffect(() => {
    if (!isOpen) {
      fetchCounts();
    }

    const interval = setInterval(() => {
      if (!isOpen) {
        fetchCounts();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const totalCount = counts.pendingOrders + counts.pendingReviews + counts.pendingProductReviews;

  const notifications = [
    {
      label: "طلبات قيد الانتظار",
      count: counts.pendingOrders,
      icon: ShoppingBag,
      path: "/admin/orders",
      color: "text-orange-500",
    },
    {
      label: "تقييمات تحتاج موافقة",
      count: counts.pendingReviews,
      icon: MessageSquare,
      path: "/admin/reviews",
      color: "text-blue-500",
    },
    {
      label: "تقييمات منتجات تحتاج موافقة",
      count: counts.pendingProductReviews,
      icon: Star,
      path: "/admin/reviews",
      color: "text-yellow-500",
    },
  ];

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);

        if (open) {
          setCounts({
            pendingOrders: 0,
            pendingReviews: 0,
            pendingProductReviews: 0,
          });
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />

          {totalCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end" dir="rtl">
        <div className="p-3 border-b border-border">
          <h3 className="font-heading text-sm">الإشعارات</h3>
        </div>
        <div className="divide-y divide-border">
          {notifications
            .filter((item) => item.count > 0)
            .map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-right"
              >
                <div className={`p-2 rounded-full bg-muted ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-body">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.count} {item.count === 1 ? "عنصر" : "عناصر"}
                  </p>
                </div>
                {item.count > 0 && (
                  <span className="w-6 h-6 bg-destructive/10 text-destructive text-xs rounded-full flex items-center justify-center font-bold">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
        </div>
        {totalCount === 0 && <div className="p-6 text-center text-muted-foreground text-sm">لا توجد إشعارات جديدة</div>}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsDropdown;
