import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, ExternalLink, Loader2, RefreshCw, Save, ToggleLeft } from "lucide-react";
import { Link } from "react-router-dom";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type BannerSchedule = {
  id: string;
  title: string;
  title_ar: string;
  image_url: string;
  page_slug: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  starts_at: string | null;
  ends_at: string | null;
};

type Draft = { startsAt: string; endsAt: string; active: boolean };
type Status = "draft" | "scheduled" | "live" | "expired";

const toLocalInput = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const toIsoOrNull = (value: string) => value ? new Date(value).toISOString() : null;

const bannerStatus = (banner: Pick<BannerSchedule, "is_active" | "starts_at" | "ends_at">): Status => {
  if (!banner.is_active) return "draft";
  const now = Date.now();
  const start = banner.starts_at ? new Date(banner.starts_at).getTime() : null;
  const end = banner.ends_at ? new Date(banner.ends_at).getTime() : null;
  if (start && start > now) return "scheduled";
  if (end && end < now) return "expired";
  return "live";
};

const STATUS_META: Record<Status, { label: string; className: string }> = {
  draft: { label: "مسودة / مخفي", className: "bg-[#F3F4F6] text-[#747C86]" },
  scheduled: { label: "مجدول", className: "bg-[#EEF5FF] text-[#557CA9]" },
  live: { label: "منشور الآن", className: "bg-[#EEF7F0] text-[#568468]" },
  expired: { label: "منتهي", className: "bg-[#FFF0F1] text-[#B96670]" },
};

const AdminPublishingWorkspacePage = () => {
  const [banners, setBanners] = useState<BannerSchedule[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("banners")
        .select("id,title,title_ar,image_url,page_slug,is_active,sort_order,starts_at,ends_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as BannerSchedule[];
      setBanners(rows);
      setDrafts(Object.fromEntries(rows.map((banner) => [banner.id, {
        startsAt: toLocalInput(banner.starts_at),
        endsAt: toLocalInput(banner.ends_at),
        active: banner.is_active !== false,
      }])));
    } catch (error) {
      console.error(error);
      toast({ title: "تعذر تحميل جدولة البانرات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const statuses = banners.map(bannerStatus);
    return {
      total: banners.length,
      live: statuses.filter((value) => value === "live").length,
      scheduled: statuses.filter((value) => value === "scheduled").length,
      draft: statuses.filter((value) => value === "draft").length,
      expired: statuses.filter((value) => value === "expired").length,
    };
  }, [banners]);

  const save = async (banner: BannerSchedule) => {
    const draft = drafts[banner.id];
    if (!draft) return;
    if (draft.startsAt && draft.endsAt && new Date(draft.endsAt) <= new Date(draft.startsAt)) {
      toast({ title: "موعد غير صالح", description: "وقت النهاية يجب أن يكون بعد وقت البداية.", variant: "destructive" });
      return;
    }

    setSavingId(banner.id);
    try {
      const payload = {
        starts_at: toIsoOrNull(draft.startsAt),
        ends_at: toIsoOrNull(draft.endsAt),
        is_active: draft.active,
      };
      const { error } = await (supabase as any).from("banners").update(payload).eq("id", banner.id);
      if (error) throw error;

      setBanners((current) => current.map((item) => item.id === banner.id ? {
        ...item,
        starts_at: payload.starts_at,
        ends_at: payload.ends_at,
        is_active: payload.is_active,
      } : item));
      toast({ title: "تم حفظ جدولة البانر", description: banner.title_ar || banner.title });
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر الحفظ";
      toast({ title: "تعذر حفظ الجدولة", description: message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader
        category="إدارة النشر"
        title="جدولة البانرات"
        description="حدد متى يظهر كل بانر ومتى يختفي. الحملات والعروض تدعم الجدولة أصلًا من صفحاتها الحالية."
        actions={[
          { label: "إدارة البانرات", icon: ExternalLink, href: "/admin/banners" },
          { label: "الحملات", icon: CalendarClock, href: "/admin/campaigns" },
        ]}
      />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-5">
        <Stat label="كل البانرات" value={stats.total} />
        <Stat label="منشور الآن" value={stats.live} />
        <Stat label="مجدول" value={stats.scheduled} />
        <Stat label="مسودة / مخفي" value={stats.draft} />
        <Stat label="منتهي" value={stats.expired} />
      </section>

      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div className="flex items-center gap-[8px]">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F3F1FF] text-[#675CBA]"><CalendarClock className="h-[13px] w-[13px]" /></span>
            <div><p className="text-[9px] font-semibold text-[#4A525C]">نوافذ النشر</p><p className="mt-[2px] text-[6.5px] text-[#969EA8]">وقت فارغ يعني بدون حد زمني من تلك الجهة.</p></div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="h-[31px] rounded-[8px] border-[#E3E7EC] px-[8px] text-[7px] shadow-none">
            {loading ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : <RefreshCw className="ml-1 h-3 w-3" />}تحديث
          </Button>
        </div>

        {loading ? (
          <div className="grid min-h-[220px] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#675CBA]" /></div>
        ) : banners.length === 0 ? (
          <div className="grid min-h-[220px] place-items-center text-[8px] text-[#969EA8]">لا توجد بانرات.</div>
        ) : (
          <div className="divide-y divide-[#EDF0F3]">
            {banners.map((banner) => {
              const draft = drafts[banner.id] || { startsAt: "", endsAt: "", active: true };
              const previewStatus = bannerStatus({
                is_active: draft.active,
                starts_at: toIsoOrNull(draft.startsAt),
                ends_at: toIsoOrNull(draft.endsAt),
              });
              const status = STATUS_META[previewStatus];
              return (
                <div key={banner.id} className="p-[12px]">
                  <div className="grid gap-[10px] xl:grid-cols-[1.2fr_1fr_1fr_auto_auto] xl:items-center">
                    <div className="flex min-w-0 items-center gap-[9px]">
                      <div className="h-[46px] w-[72px] shrink-0 overflow-hidden rounded-[8px] border border-[#E6E9EE] bg-[#F3F4F6]">
                        <img src={banner.image_url} alt={banner.title_ar || banner.title} className="h-full w-full object-cover" loading="lazy" />
                      </div>
                      <div className="min-w-0"><p className="truncate text-[8.5px] font-semibold text-[#4B535E]">{banner.title_ar || banner.title}</p><p className="mt-[2px] truncate text-[6.5px] text-[#969EA8]">{banner.title}{banner.page_slug ? ` • /banner/${banner.page_slug}` : ""}</p></div>
                    </div>

                    <label className="block"><span className="mb-[4px] block text-[6.5px] font-medium text-[#8E96A1]">يبدأ في</span><Input type="datetime-local" value={draft.startsAt} onChange={(event) => setDrafts((current) => ({ ...current, [banner.id]: { ...draft, startsAt: event.target.value } }))} className="h-[35px] rounded-[8px] border-[#E3E7EC] bg-[#F8FAFC] text-[7.5px] shadow-none focus-visible:ring-0" /></label>
                    <label className="block"><span className="mb-[4px] block text-[6.5px] font-medium text-[#8E96A1]">ينتهي في</span><Input type="datetime-local" value={draft.endsAt} onChange={(event) => setDrafts((current) => ({ ...current, [banner.id]: { ...draft, endsAt: event.target.value } }))} className="h-[35px] rounded-[8px] border-[#E3E7EC] bg-[#F8FAFC] text-[7.5px] shadow-none focus-visible:ring-0" /></label>

                    <div className="flex items-center gap-[7px]"><Switch checked={draft.active} onCheckedChange={(active) => setDrafts((current) => ({ ...current, [banner.id]: { ...draft, active } }))} /><span className={cn("rounded-full px-[7px] py-[4px] text-[6px] font-semibold", status.className)}>{status.label}</span></div>

                    <Button size="sm" onClick={() => void save(banner)} disabled={savingId === banner.id} className="h-[34px] rounded-[8px] bg-[#675CBA] px-[9px] text-[7px] text-white hover:bg-[#5D52AE]">
                      {savingId === banner.id ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : <Save className="ml-1 h-3 w-3" />}حفظ
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-[9px] md:grid-cols-2">
        <Link to="/admin/campaigns" className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px] transition hover:border-[#D7DBE2]"><div className="flex items-center gap-[8px]"><CheckCircle2 className="h-[14px] w-[14px] text-[#568468]" /><div><p className="text-[8.5px] font-semibold text-[#4B535E]">الحملات</p><p className="mt-[2px] text-[6.5px] text-[#969EA8]">تدعم مسودة + بداية + نهاية + حالات مجدول ومنتهي.</p></div></div></Link>
        <Link to="/admin/offers" className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px] transition hover:border-[#D7DBE2]"><div className="flex items-center gap-[8px]"><Clock3 className="h-[14px] w-[14px] text-[#557CA9]" /><div><p className="text-[8.5px] font-semibold text-[#4B535E]">العروض</p><p className="mt-[2px] text-[6.5px] text-[#969EA8]">تدعم Start/End وDraft بالفعل، لذلك لم نكررها هنا.</p></div></div></Link>
      </section>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-[14px] border border-[#E5E9EF] bg-white p-[11px]"><div className="flex items-center gap-[7px]"><ToggleLeft className="h-[12px] w-[12px] text-[#675CBA]" /><span className="text-[7px] font-semibold text-[#858D98]">{label}</span></div><p className="mt-[7px] text-[19px] font-bold leading-none text-[#353D47]">{value.toLocaleString("ar-EG")}</p></div>
);

export default AdminPublishingWorkspacePage;
