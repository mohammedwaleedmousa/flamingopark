import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, LucideIcon, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  category?: string;
  actions?: Array<{
    label: string;
    icon: LucideIcon;
    href?: string;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "outline" | "destructive";
  }>;
}

const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ title, description, category, actions = [] }) => {
  const showCustomerPresence = category === "العملاء" && title === "إدارة العملاء";

  return (
    <>
      <header dir="rtl" className="mb-5 flex w-full flex-col gap-4 border-b border-[#E5E8ED] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 text-right">
          {category && (
            <div className="mb-[7px] flex items-center gap-[7px]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#675CBA]" />
              <span className="text-[8px] font-semibold text-[#8E96A1]">{category}</span>
            </div>
          )}

          <h1 className="font-heading text-[22px] font-bold leading-tight tracking-[-0.45px] text-[#20242D] md:text-[25px]">{title}</h1>

          {description && <p className="mt-[6px] max-w-[680px] text-[10.5px] font-medium leading-[1.75] text-[#8E96A1] md:text-[11px]">{description}</p>}
        </div>

        {actions.length > 0 && (
          <div className="flex w-full flex-wrap items-center gap-[7px] sm:w-auto sm:justify-end">
            {actions.map((action, index) => (
              <AdminHeaderAction key={`${action.label}-${index}`} action={action} />
            ))}
          </div>
        )}
      </header>
      {showCustomerPresence && <CustomerPresenceSummary />}
    </>
  );
};

const CustomerPresenceSummary = () => {
  const [online, setOnline] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [loggedOutToday, setLoggedOutToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const db = supabase as any;
    const onlineSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [onlineResult, todayResult, logoutResult] = await Promise.all([
      db.from("customers").select("id", { count: "exact", head: true }).gte("last_seen_at", onlineSince),
      db.from("customers").select("id", { count: "exact", head: true }).gte("last_seen_at", today),
      db.from("customers").select("id", { count: "exact", head: true }).gte("last_logout_at", today),
    ]);

    if (!onlineResult.error) setOnline(onlineResult.count || 0);
    if (!todayResult.error) setActiveToday(todayResult.count || 0);
    if (!logoutResult.error) setLoggedOutToday(logoutResult.count || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <section dir="rtl" className="mb-4 flex flex-wrap items-center gap-2 rounded-[14px] border border-[#E5E9EF] bg-white p-2.5">
      <div className="flex min-w-[115px] flex-1 items-center gap-2 rounded-[10px] bg-[#F1FBF6] px-3 py-2.5">
        <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
          <Activity className="h-3.5 w-3.5" />
          <span className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </span>
        <div><p className="text-[7px] font-semibold text-[#7C8780]">متصل الآن</p><p className="text-[16px] font-bold leading-tight text-[#26332B]">{online.toLocaleString("en-US")}</p></div>
      </div>
      <div className="min-w-[105px] flex-1 rounded-[10px] bg-[#F7F8FA] px-3 py-2.5"><p className="text-[7px] font-semibold text-[#8A929C]">نشط اليوم</p><p className="text-[16px] font-bold leading-tight text-[#2B3037]">{activeToday.toLocaleString("en-US")}</p></div>
      <div className="min-w-[105px] flex-1 rounded-[10px] bg-[#F7F8FA] px-3 py-2.5"><p className="text-[7px] font-semibold text-[#8A929C]">سجل خروج اليوم</p><p className="text-[16px] font-bold leading-tight text-[#2B3037]">{loggedOutToday.toLocaleString("en-US")}</p></div>
      <button type="button" onClick={() => void refresh()} aria-label="تحديث نشاط العملاء" className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#E5E9EF] text-[#7C848E] hover:bg-[#F8FAFC]">
        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
      </button>
    </section>
  );
};

const AdminHeaderAction = ({ action }: { action: NonNullable<AdminPageHeaderProps["actions"]>[number] }) => {
  const Icon = action.icon;

  const className = cn(
    "inline-flex h-[38px] items-center justify-center gap-[7px] rounded-[10px] border px-[12px] text-[10px] font-semibold transition-colors duration-150",
    action.variant === "primary" && "border-[#675CBA] bg-[#675CBA] text-white hover:border-[#594FAB] hover:bg-[#594FAB]",
    action.variant === "secondary" && "border-[#D9E3F3] bg-[#EFF4FC] text-[#506A91] hover:bg-[#E8F0FA]",
    action.variant === "destructive" && "border-[#F0D5D1] bg-[#FFF3F1] text-[#C15F56] hover:bg-[#FFEDEA]",
    (!action.variant || action.variant === "outline") && "border-[#E2E6EB] bg-white text-[#5E6671] hover:border-[#D6DBE2] hover:bg-[#F8FAFC] hover:text-[#343B44]",
  );

  const content = (
    <>
      <Icon className="h-[12px] w-[12px] shrink-0" strokeWidth={1.8} />
      <span className="whitespace-nowrap">{action.label}</span>
    </>
  );

  if (action.href) {
    return (
      <Link to={action.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} className={className}>
      {content}
    </button>
  );
};

export default AdminPageHeader;
