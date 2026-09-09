import { useCallback, useEffect, useState } from "react";
import { Activity, Clock3, RefreshCw, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminCustomersPage from "./AdminCustomersPage";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const REFRESH_MS = 30_000;

type PresenceStats = {
  online: number;
  activeToday: number;
  loggedOutToday: number;
};

const startOfTodayIso = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start.toISOString();
};

const AdminCustomersPresencePage = () => {
  const [stats, setStats] = useState<PresenceStats>({ online: 0, activeToday: 0, loggedOutToday: 0 });
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    const db = supabase as any;
    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const today = startOfTodayIso();

    const [onlineResult, todayResult, logoutResult] = await Promise.all([
      db.from("customers").select("id", { count: "exact", head: true }).gte("last_seen_at", onlineSince),
      db.from("customers").select("id", { count: "exact", head: true }).gte("last_seen_at", today),
      db.from("customers").select("id", { count: "exact", head: true }).gte("last_logout_at", today),
    ]);

    if (!onlineResult.error && !todayResult.error && !logoutResult.error) {
      setStats({
        online: onlineResult.count || 0,
        activeToday: todayResult.count || 0,
        loggedOutToday: logoutResult.count || 0,
      });
      setUpdatedAt(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <div className="space-y-4" dir="rtl">
      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-4 py-3">
          <div>
            <p className="text-[11px] font-bold text-[#303640]">نشاط العملاء الآن</p>
            <p className="mt-1 text-[8px] text-[#9299A3]">يتحدث تلقائيًا كل 30 ثانية</p>
          </div>
          <button type="button" onClick={() => void refresh()} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E5E9EF] px-2.5 text-[8px] font-semibold text-[#69717C] hover:bg-[#F8FAFC]">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3">
          <PresenceCard icon={Activity} label="متصل الآن" value={stats.online} helper="نشط خلال آخر دقيقتين" live />
          <PresenceCard icon={UsersRound} label="نشط اليوم" value={stats.activeToday} helper="دخل الموقع اليوم" />
          <PresenceCard icon={Clock3} label="سجل خروج اليوم" value={stats.loggedOutToday} helper="خروج صريح من الحساب" />
        </div>

        {updatedAt && <p className="px-4 pb-3 text-[7px] text-[#A0A6AE]">آخر تحديث: {updatedAt.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" })}</p>}
      </section>

      <AdminCustomersPage />
    </div>
  );
};

const PresenceCard = ({ icon: Icon, label, value, helper, live = false }: { icon: any; label: string; value: number; helper: string; live?: boolean }) => (
  <div className="rounded-xl border border-[#E8EBEF] bg-[#FAFBFC] p-3">
    <div className="flex items-center gap-2">
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#5F6874] shadow-sm">
        <Icon className="h-3.5 w-3.5" />
        {live && <span className="absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />}
      </div>
      <div>
        <p className="text-[8px] font-semibold text-[#7D858F]">{label}</p>
        <p className="mt-0.5 text-lg font-bold leading-none text-[#252B33]">{value.toLocaleString("en-US")}</p>
      </div>
    </div>
    <p className="mt-2 text-[7px] text-[#A0A6AE]">{helper}</p>
  </div>
);

export default AdminCustomersPresencePage;
