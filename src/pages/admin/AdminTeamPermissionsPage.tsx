import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, UserRound, Users } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ADMIN_PERMISSION_CATALOG, type AdminPermission } from "@/lib/adminProductivityDefaults";
import { hasAdminPermission } from "@/lib/adminProductivity";
import { cn } from "@/lib/utils";

type AdminMember = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type PermissionRow = { user_id: string; permission: string; granted: boolean };

const PERMISSION_META: Record<AdminPermission, { label: string; group: string }> = {
  "products.view": { label: "عرض المنتجات", group: "المنتجات" },
  "products.edit": { label: "تعديل المنتجات", group: "المنتجات" },
  "products.delete": { label: "حذف المنتجات", group: "المنتجات" },
  "products.bulk_update": { label: "تعديل المنتجات جماعيًا", group: "المنتجات" },
  "inventory.view": { label: "عرض المخزون", group: "المخزون" },
  "inventory.adjust": { label: "تعديل المخزون", group: "المخزون" },
  "orders.view": { label: "عرض الطلبات", group: "الطلبات" },
  "orders.manage": { label: "إدارة الطلبات", group: "الطلبات" },
  "orders.delete": { label: "حذف الطلبات", group: "الطلبات" },
  "customers.view": { label: "عرض العملاء", group: "العملاء" },
  "customers.manage": { label: "إدارة العملاء", group: "العملاء" },
  "marketing.view": { label: "عرض التسويق", group: "التسويق" },
  "marketing.manage": { label: "إدارة التسويق", group: "التسويق" },
  "finance.view": { label: "عرض المالية", group: "المالية" },
  "finance.manage": { label: "إدارة المالية", group: "المالية" },
  "reports.view": { label: "عرض التقارير", group: "التقارير" },
  "settings.manage": { label: "إدارة الإعدادات", group: "النظام" },
  "admin.approvals.review": { label: "مراجعة الموافقات", group: "النظام" },
  "admin.permissions.manage": { label: "إدارة صلاحيات الفريق", group: "النظام" },
};

const AdminTeamPermissionsPage = () => {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [permissionRows, setPermissionRows] = useState<PermissionRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: authData, error: authError }, manageAllowed] = await Promise.all([
        supabase.auth.getUser(),
        hasAdminPermission("admin.permissions.manage"),
      ]);
      if (authError) throw authError;
      const userId = authData.user?.id || null;
      setCurrentUserId(userId);
      setCanManage(manageAllowed);

      if (!manageAllowed) {
        setMembers([]);
        setPermissionRows([]);
        return;
      }

      const client = supabase as any;
      const { data: roleRows, error: rolesError } = await client.from("user_roles").select("user_id").eq("role", "admin").order("created_at", { ascending: true });
      if (rolesError) throw rolesError;
      const ids = Array.from(new Set((roleRows ?? []).map((row: any) => String(row.user_id)).filter(Boolean))) as string[];

      if (ids.length === 0) {
        setMembers([]);
        setPermissionRows([]);
        return;
      }

      const [{ data: profiles, error: profilesError }, { data: permissions, error: permissionsError }] = await Promise.all([
        client.from("profiles").select("id,full_name,phone,avatar_url").in("id", ids),
        client.from("admin_user_permissions").select("user_id,permission,granted").in("user_id", ids),
      ]);
      if (profilesError) throw profilesError;
      if (permissionsError) throw permissionsError;

      const profileMap = new Map((profiles ?? []).map((profile: any) => [String(profile.id), profile]));
      const nextMembers = ids.map((id) => {
        const profile = profileMap.get(id) as any;
        return {
          id,
          full_name: profile?.full_name ?? null,
          phone: profile?.phone ?? null,
          avatar_url: profile?.avatar_url ?? null,
        } as AdminMember;
      });
      setMembers(nextMembers);
      setPermissionRows((permissions ?? []) as PermissionRow[]);
      setSelectedId((current) => current && ids.includes(current) ? current : (userId && ids.includes(userId) ? userId : ids[0]));
    } catch (error) {
      console.error(error);
      toast({ title: "تعذر تحميل صلاحيات الفريق", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selectedMember = members.find((member) => member.id === selectedId) || null;

  const explicitPermissions = useMemo(() => {
    const map = new Map<string, boolean>();
    permissionRows.filter((row) => row.user_id === selectedId).forEach((row) => map.set(row.permission, row.granted));
    return map;
  }, [permissionRows, selectedId]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, AdminPermission[]>();
    for (const permission of ADMIN_PERMISSION_CATALOG) {
      const group = PERMISSION_META[permission].group;
      groups.set(group, [...(groups.get(group) || []), permission]);
    }
    return [...groups.entries()];
  }, []);

  const isGranted = (permission: AdminPermission) => explicitPermissions.get(permission) !== false;

  const setPermission = async (permission: AdminPermission, granted: boolean) => {
    if (!selectedId || !canManage) return;
    if (selectedId === currentUserId && permission === "admin.permissions.manage" && !granted) {
      toast({ title: "تم منع قفل حسابك", description: "لا يمكن تعطيل صلاحية إدارة الصلاحيات عن حسابك الحالي من هذه الصفحة.", variant: "destructive" });
      return;
    }

    const key = `${selectedId}:${permission}`;
    const previous = permissionRows;
    setBusyKey(key);
    setPermissionRows((current) => {
      const filtered = current.filter((row) => !(row.user_id === selectedId && row.permission === permission));
      return [...filtered, { user_id: selectedId, permission, granted }];
    });

    try {
      const { error } = await (supabase as any).from("admin_user_permissions").upsert({
        user_id: selectedId,
        permission,
        granted,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,permission" });
      if (error) throw error;
    } catch (error) {
      console.error(error);
      setPermissionRows(previous);
      toast({ title: "تعذر حفظ الصلاحية", variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader
        category="الفريق والنظام"
        title="صلاحيات فريق الأدمن"
        description="حدد ما يستطيع كل عضو أدمن الوصول إليه. عدم وجود استثناء يعني السماح للحفاظ على التوافق مع النظام الحالي."
        actions={[{ label: "تحديث", icon: RefreshCw, onClick: () => void load() }]}
      />

      {!canManage && !loading ? (
        <section className="grid min-h-[300px] place-items-center rounded-[16px] border border-[#E5E9EF] bg-white px-5 text-center">
          <div><ShieldCheck className="mx-auto h-7 w-7 text-[#A0A7B0]" /><h2 className="mt-3 text-[11px] font-semibold text-[#4D555F]">ليس لديك صلاحية إدارة الفريق</h2><p className="mt-1 text-[8px] text-[#969EA8]">تحتاج admin.permissions.manage للوصول إلى هذه الشاشة.</p></div>
        </section>
      ) : loading ? (
        <div className="grid min-h-[300px] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#675CBA]" /></div>
      ) : (
        <section className="grid gap-[10px] xl:grid-cols-12">
          <div className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white xl:col-span-4">
            <div className="flex items-center gap-[8px] border-b border-[#EDF0F3] px-[12px] py-[10px]"><Users className="h-[13px] w-[13px] text-[#675CBA]" /><div><p className="text-[9px] font-semibold text-[#4A525C]">أعضاء الأدمن</p><p className="mt-[2px] text-[6.5px] text-[#969EA8]">{members.length} عضو</p></div></div>
            {members.length === 0 ? <div className="grid min-h-[180px] place-items-center text-[8px] text-[#969EA8]">لا يوجد أعضاء أدمن.</div> : (
              <div className="divide-y divide-[#EDF0F3]">{members.map((member) => (
                <button key={member.id} type="button" onClick={() => setSelectedId(member.id)} className={cn("flex w-full items-center gap-[9px] px-[11px] py-[10px] text-right transition", selectedId === member.id ? "bg-[#F5F2FF]" : "hover:bg-[#FBFCFD]")}>
                  <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#F1EFFF] text-[#675CBA]">{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-[14px] w-[14px]" />}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[8.5px] font-semibold text-[#4B535E]">{member.full_name || (member.id === currentUserId ? "حسابك الحالي" : "عضو أدمن")}</span><span dir="ltr" className="mt-[2px] block truncate text-right text-[6.5px] text-[#969EA8]">{member.phone || member.id.slice(0, 8)}</span></span>
                  {member.id === currentUserId ? <span className="rounded-full bg-[#EEF7F0] px-[6px] py-[3px] text-[6px] font-semibold text-[#568468]">أنت</span> : null}
                </button>
              ))}</div>
            )}
          </div>

          <div className="space-y-[10px] xl:col-span-8">
            <section className="rounded-[16px] border border-[#E5E9EF] bg-white p-[12px]">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold text-[#4A525C]">{selectedMember?.full_name || "صلاحيات العضو"}</p><p className="mt-[3px] text-[7px] text-[#969EA8]">التبديل إلى إيقاف يسجل منعًا صريحًا. التشغيل يسمح بالصلاحية.</p></div><ShieldCheck className="h-[17px] w-[17px] text-[#675CBA]" /></div>
            </section>

            {groupedPermissions.map(([group, permissions]) => (
              <section key={group} className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
                <div className="border-b border-[#EDF0F3] bg-[#FBFCFD] px-[12px] py-[8px]"><p className="text-[8px] font-semibold text-[#69717C]">{group}</p></div>
                <div className="divide-y divide-[#EDF0F3]">{permissions.map((permission) => {
                  const key = `${selectedId}:${permission}`;
                  const protectedSelfPermission = selectedId === currentUserId && permission === "admin.permissions.manage";
                  return (
                    <div key={permission} className="flex items-center justify-between gap-3 px-[12px] py-[9px]">
                      <div><p className="text-[8.5px] font-semibold text-[#4D555F]">{PERMISSION_META[permission].label}</p><p className="mt-[2px] text-[6px] text-[#9AA2AC]">{permission}{protectedSelfPermission ? " • محمية لحسابك الحالي" : ""}</p></div>
                      <div className="flex items-center gap-[7px]">{busyKey === key ? <Loader2 className="h-3 w-3 animate-spin text-[#675CBA]" /> : null}<Switch checked={isGranted(permission)} disabled={Boolean(busyKey) || protectedSelfPermission} onCheckedChange={(checked) => void setPermission(permission, checked)} /></div>
                    </div>
                  );
                })}</div>
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminTeamPermissionsPage;
