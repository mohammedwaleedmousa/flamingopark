import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, ShoppingBag, MessageSquare, Check, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface NotificationCounts {
  pendingOrders: number;
  pendingReviews: number;
  generalNotifications: number;
}

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  related_order_id: string | null;
  created_at: string;
}

const NotificationsDropdown = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<NotificationCounts>({
    pendingOrders: 0,
    pendingReviews: 0,
    generalNotifications: 0,
  });
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchCounts = async () => {
    try {
      const [ordersRes, reviewsRes, notificationsRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .or("is_approved.eq.false,is_approved.is.null"),
        supabase
          .from("admin_notifications")
          .select("*")
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setCounts({
        pendingOrders: ordersRes.count || 0,
        pendingReviews: reviewsRes.count || 0,
        generalNotifications: notificationsRes.data?.length || 0,
      });
      
      setNotifications(notificationsRes.data || []);
    } catch (error) {
      console.error("Error fetching notification counts:", error);
    }
  };

  // Realtime subscription for new notifications
  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    
    // Subscribe to realtime notifications
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          console.log('New notification:', payload);
          fetchCounts();
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  // refresh counts when popover opens
  useEffect(() => {
    if (isOpen) fetchCounts();
  }, [isOpen]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    fetchCounts();
  };

  const markAllAsRead = async () => {
    await supabase
      .from("admin_notifications")
      .update({ is_read: true })
      .eq("is_read", false);
    fetchCounts();
  };

  const deleteNotification = async (notificationId: string) => {
    await supabase
      .from("admin_notifications")
      .delete()
      .eq("id", notificationId);
    fetchCounts();
  };

  const totalCount = counts.pendingOrders + counts.pendingReviews + counts.generalNotifications;

  const quickNotifications = [
    {
      label: "طلبات قيد الانتظار",
      count: counts.pendingOrders,
      icon: ShoppingBag,
      path: "/admin/orders",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      label: "تقييمات تحتاج موافقة",
      count: counts.pendingReviews,
      icon: MessageSquare,
      path: "/admin/reviews",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    markAsRead(notification.id);
    if (notification.related_order_id) {
      handleNavigate("/admin/orders");
    }
  };

  // Don't render the bell icon if there are no notifications
  if (totalCount === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {!isOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" dir="rtl">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-heading text-sm">الإشعارات</h3>
          {counts.generalNotifications > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              <Check className="w-3 h-3 ml-1" />
              قراءة الكل
            </Button>
          )}
        </div>
        
        {/* Quick Stats */}
        <div className="divide-y divide-border border-b border-border">
          {quickNotifications
            .filter((item) => item.count > 0)
            .map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-right"
              >
                <div className={`p-2 rounded-full ${item.bgColor} ${item.color}`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-body">{item.label}</p>
                </div>
                <span className="w-6 h-6 bg-destructive/10 text-destructive text-xs rounded-full flex items-center justify-center font-bold">
                  {item.count}
                </span>
              </button>
            ))}
        </div>

        {/* General Notifications */}
        {notifications.length > 0 && (
          <>
            <div className="px-3 py-2 bg-muted/50">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                إشعارات النظام
              </p>
            </div>
            <ScrollArea className="max-h-64">
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-full bg-primary/10 text-primary mt-0.5">
                        <Info className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { 
                            addSuffix: true, 
                            locale: ar 
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
        
        {totalCount === 0 && (
          <div className="p-6 text-center text-muted-foreground text-sm">
            لا توجد إشعارات جديدة
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsDropdown;
