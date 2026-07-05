import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trash2, Check, CheckCircle2, Clock, AlertCircle, Package, Heart, Star } from 'lucide-react';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  type: 'order' | 'wish' | 'review' | 'system' | 'offer';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'order',
      title: 'تم تأكيد طلبك',
      message: 'تم تأكيد طلبك #ORD-123456 وسيتم توصيله قريباً',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      actionUrl: '/order-tracking'
    },
    {
      id: '2',
      type: 'wish',
      title: 'منتج في قائمة المفضلة متوفر',
      message: 'المنتج الذي أضفته للمفضلة "خاتم ذهبي" متوفر الآن',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      read: false
    },
    {
      id: '3',
      type: 'offer',
      title: 'عرض خاص جديد',
      message: 'استمتع بخصم 30% على جميع المجوهرات الذهبية',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
      actionUrl: '/offers'
    },
    {
      id: '4',
      type: 'system',
      title: 'ترحيب بك في فلامينجو بارك',
      message: 'شكراً لك على الانضمام لعائلتنا. استمتع بتجربة تسوق رائعة',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      read: true
    }
  ]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return Package;
      case 'wish':
        return Heart;
      case 'review':
        return Star;
      case 'offer':
        return AlertCircle;
      default:
        return Bell;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-100 text-blue-600';
      case 'wish':
        return 'bg-pink-100 text-pink-600';
      case 'review':
        return 'bg-yellow-100 text-yellow-600';
      case 'offer':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString('ar-SA');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const sortedNotifications = [...notifications].sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      
      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative bg-gradient-to-b from-gold/5 via-muted/30 to-background border-b border-border/50"
        >
          <div className="container mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-heading text-3xl md:text-4xl text-foreground"
              >
                الإشعارات
              </motion.h1>
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-gold text-white px-4 py-2 rounded-full text-sm font-medium"
                >
                  {unreadCount} جديد
                </motion.div>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                تحديد الكل كمقروء
              </Button>
            )}
          </div>
        </motion.section>

        <div className="container mx-auto px-4 py-8">
          {sortedNotifications.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 max-w-2xl"
            >
              <AnimatePresence>
                {sortedNotifications.map((notification) => {
                  const Icon = getIcon(notification.type);
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`border rounded-lg p-4 transition-all ${
                        notification.read
                          ? 'bg-card border-border'
                          : 'bg-gold/5 border-gold/30 shadow-sm'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(notification.type)}`}>
                          <Icon className="w-6 h-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-heading text-foreground">{notification.title}</h3>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-body mb-2">{notification.message}</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(notification.timestamp)}
                            </span>
                            <div className="flex gap-2">
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1.5 hover:bg-muted rounded transition"
                                  title="تحديد كمقروء"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                </button>
                              )}
                              {notification.actionUrl && (
                                <a
                                  href={notification.actionUrl}
                                  className="text-xs text-gold hover:text-gold/80 transition font-medium"
                                >
                                  عرض
                                </a>
                              )}
                              <button
                                onClick={() => deleteNotification(notification.id)}
                                className="p-1.5 hover:bg-muted rounded transition"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="font-heading text-xl text-foreground mb-2">لا توجد إشعارات</h2>
              <p className="text-muted-foreground font-body">
                ستصلك الإشعارات عند توفر منتجات أو عروض جديدة
              </p>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotificationsPage;
