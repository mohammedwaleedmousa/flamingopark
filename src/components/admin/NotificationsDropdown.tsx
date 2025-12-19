import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, ShoppingBag, MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";

interface NotificationItem {
  label: string;
  count: number;
  icon: any;
  path: string;
  color: string;
  seen?: boolean;
}

const NotificationsDropdown = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const [ordersRes, reviewsRes, productReviewsRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
      ]);

      setNotifications([
        {
          label: "طلبات قيد الانتظار",
          count: ordersRes.count || 0,
          icon: ShoppingBag,
          path: "/admin/orders",
          color: "text-orange-500",
          seen: false,
        },
        {
          label: "تقييمات تحتاج موافقة",
          count: reviewsRes.count || 0,
          icon: MessageSquare,
          path: "/admin/reviews",
          color: "text-blue-500",
          seen: false,
        },
        {
          label: "تقييمات منتجات تحتاج موافقة",
          count: productReviewsRes.count || 0,
          icon: Star,
          path: "/admin/reviews",
          color: "text-yellow-500",
          seen: false,
        },
      ]);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime Subscriptions
    const ordersSub = supabase
      .from("orders")
      .on("INSERT", () => fetchNotifications())
      .on("UPDATE", () => fetchNotifications())
      .subscribe();

    const reviewsSub = supabase
      .from("reviews")
      .on("INSERT", () => fetchNotifications())
      .on("UPDATE", () => fetchNotifications())
      .subscribe();

    const productReviewsSub = supabase
      .from("product_reviews")
      .on("INSERT", () => fetchNotifications())
      .on("UPDATE", () => fetchNotifications())
      .subscribe();

    return () => {
      supabase.removeSubscription(ordersSub);
      supabase.removeSubscription(reviewsSub);
      supabase.removeSubscription(productReviewsSub);
    };
  }, []);

  const totalCount = notifications.reduce((acc, n) => (!n.seen ? acc + n.count : acc), 0);

  const handleNavigate = (path: string, index: number) => {
    setIsOpen(false);

    // علم الإشعار كمقروء
    setNotifications((prev) => {
      const copy = [...prev];
      copy[index].seen = true;
      return copy;
    });

    navigate(path);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
            .map((item, index) => (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.path, index)}
                className={`w-full flex items-center gap-3 p-3 text-right transition-colors ${
                  !item.seen ? "bg-muted/10 hover:bg-muted/20" : "hover:bg-muted"
                }`}
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
                {!item.seen && (
                  <span className="w-6 h-6 bg-destructive/10 text-destructive text-xs rounded-full flex items-center justify-center font-bold">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
        </div>
        {notifications.every((item) => item.count === 0 || item.seen) && (
          <div className="p-6 text-center text-muted-foreground text-sm">لا توجد إشعارات جديدة</div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsDropdown;
