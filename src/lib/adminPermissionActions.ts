import { hasAdminPermission } from "@/lib/adminProductivity";

export const requireAdminPermission = async (permission: string) => {
  const granted = await hasAdminPermission(permission);
  if (!granted) {
    throw new Error(`ليس لديك صلاحية تنفيذ هذا الإجراء (${permission})`);
  }
};
