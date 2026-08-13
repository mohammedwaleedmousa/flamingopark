import { AlertCircle, Bell, Check, CheckCircle2, Clock3, Package, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

import { useCustomerNotifications } from "@/hooks/useCustomerNotifications";

const NotificationsPage = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useCustomerNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return Package;

      case "system":
        return AlertCircle;

      default:
        return Bell;
    }
  };

  const getIconStyle = (type: string) => {
    switch (type) {
      case "order":
        return "bg-[#F7ECE9] text-[#B86168]";

      case "system":
        return "bg-[#F2EFEA] text-[#786B65]";

      default:
        return "bg-[#F5F1EE] text-[#857772]";
    }
  };

  const formatTime = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();
    const diff = Math.max(0, now.getTime() - date.getTime());

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;

    return date.toLocaleDateString("ar-YE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-16 pt-5 md:pb-20 md:pt-8">
        <div className="mx-auto w-full max-w-[820px] px-3 md:px-6">
          {/* =====================================================
              HEADER
          ===================================================== */}

          <header className="mb-6">
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
              <span className="font-serif text-[8px] uppercase tracking-[0.22em] text-[#B86168]">NOTIFICATIONS</span>
            </div>

            <div className="mt-2 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-[23px] font-semibold tracking-[-0.025em] text-[#403633] md:text-[30px]">الإشعارات</h1>

                <p className="mt-1 text-[12px] leading-6 text-[#8C7F7A]">آخر تحديثات طلباتك وتنبيهات فلامنجو.</p>
              </div>

              {unreadCount > 0 && (
                <div className="flex h-8 shrink-0 items-center gap-2 rounded-full border border-[#E6CAC7] bg-[#FFF7F5] px-3">
                  <span className="h-2 w-2 rounded-full bg-[#D4777D]" />
                  <span className="text-[11px] font-semibold text-[#A95B61]">{unreadCount} جديد</span>
                </div>
              )}
            </div>

            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllAsRead()} className="mt-4 inline-flex h-9 items-center gap-2 rounded-[9px] border border-[#DDD3CE] bg-white px-3.5 text-[11px] font-medium text-[#675A55] transition-colors hover:border-[#D3AAA7] hover:text-[#B86168]">
                <Check className="h-4 w-4" strokeWidth={1.6} />
                تحديد الكل كمقروء
              </button>
            )}
          </header>

          {/* =====================================================
              CONTENT
          ===================================================== */}

          <section className="overflow-hidden rounded-[16px] border border-[#E7DED9] bg-white">
            {/* LOADING */}

            {isLoading && (
              <div>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className={`flex gap-3 px-4 py-5 md:px-5 ${index !== 3 ? "border-b border-[#EEE7E3]" : ""}`}>
                    <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[#F0EBE8]" />

                    <div className="min-w-0 flex-1">
                      <div className="h-3 w-36 animate-pulse rounded-full bg-[#EDE7E4]" />
                      <div className="mt-3 h-2.5 w-[80%] animate-pulse rounded-full bg-[#F1ECE9]" />
                      <div className="mt-2 h-2 w-20 animate-pulse rounded-full bg-[#F3EEEB]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* EMPTY */}

            {!isLoading && notifications.length === 0 && (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-5 text-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#E8DFDB] bg-[#F8F5F3]">
                  <Bell className="h-7 w-7 text-[#968883]" strokeWidth={1.4} />

                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#F8F5F3] bg-[#D4777D]" />
                </div>

                <h2 className="mt-4 text-[16px] font-semibold text-[#403633]">لا توجد إشعارات</h2>

                <p className="mt-2 max-w-[330px] text-[12px] leading-6 text-[#91847F]">ستظهر هنا تحديثات طلباتك والعروض والتنبيهات المهمة عند توفرها.</p>
              </div>
            )}

            {/* NOTIFICATIONS */}

            {!isLoading && notifications.length > 0 && (
              <div>
                {notifications.map((notification, index) => {
                  const Icon = getIcon(notification.type);
                  const actionUrl = notification.actionUrl || "";
                  const isInternalAction = actionUrl.startsWith("/");

                  return (
                    <article key={notification.id} className={`relative px-4 py-4 transition-colors md:px-5 md:py-5 ${notification.read ? "bg-white" : "bg-[#FFFBFA]"} ${index !== notifications.length - 1 ? "border-b border-[#EEE7E3]" : ""}`}>
                      {!notification.read && <span className="absolute right-0 top-0 h-full w-[3px] bg-[#D4777D]" />}

                      <div className="flex items-start gap-3.5">
                        {/* ICON */}

                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${getIconStyle(notification.type)}`}>
                          <Icon className="h-5 w-5" strokeWidth={1.5} />
                        </div>

                        {/* CONTENT */}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className={`truncate text-[14px] text-[#493D39] ${notification.read ? "font-medium" : "font-semibold"}`}>{notification.title}</h3>

                                {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#D4777D]" />}
                              </div>

                              <p className="mt-1.5 text-[12px] leading-6 text-[#857873]">{notification.message}</p>
                            </div>

                            {/* DELETE */}

                            <button type="button" onClick={() => void deleteNotification(notification.id)} aria-label="حذف الإشعار" title="حذف" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[#A29691] transition-colors hover:bg-[#FFF2F1] hover:text-[#B86262]">
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </div>

                          {/* BOTTOM */}

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <span className="flex items-center gap-1.5 text-[10px] text-[#A0938E]">
                              <Clock3 className="h-3.5 w-3.5" strokeWidth={1.4} />
                              {formatTime(notification.timestamp)}
                            </span>

                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <button type="button" onClick={() => void markAsRead(notification.id)} className="flex h-8 items-center gap-1.5 rounded-[8px] border border-[#E3D9D5] px-2.5 text-[10px] font-medium text-[#71635E] transition-colors hover:border-[#D7AAA7] hover:text-[#B86168]">
                                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  مقروء
                                </button>
                              )}

                              {actionUrl && (
                                <>
                                  {isInternalAction ? (
                                    <Link to={actionUrl} className="flex h-8 items-center justify-center rounded-[8px] bg-[#D4777D] px-3 text-[10px] font-semibold text-white transition-colors hover:bg-[#C96B72]">
                                      عرض التفاصيل
                                    </Link>
                                  ) : (
                                    <a href={actionUrl} target="_blank" rel="noopener noreferrer" className="flex h-8 items-center justify-center rounded-[8px] bg-[#D4777D] px-3 text-[10px] font-semibold text-white transition-colors hover:bg-[#C96B72]">
                                      عرض التفاصيل
                                    </a>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* =====================================================
              SMALL FOOT NOTE
          ===================================================== */}

          {!isLoading && notifications.length > 0 && (
            <div className="mt-3 flex items-center justify-center gap-2 py-2">
              <Bell className="h-3.5 w-3.5 text-[#A99C97]" strokeWidth={1.4} />
              <p className="text-[10px] text-[#9B8D88]">يتم تحديث الإشعارات تلقائيًا عند وصول تحديث جديد.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotificationsPage;