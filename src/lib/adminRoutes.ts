export const ADMIN_BASE_PATH = "/mohammedadmin77";
export const ADMIN_LOGIN_PATH = `${ADMIN_BASE_PATH}/login`;
export const LEGACY_ADMIN_BASE_PATH = "/admin";
export const ADMIN_ROUTE_UNLOCK_KEY = "flamingo-admin-route-unlocked";

export const adminPath = (suffix = "") => {
  if (!suffix) return ADMIN_BASE_PATH;
  const normalized = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${ADMIN_BASE_PATH}${normalized}`;
};

export const legacyAdminPathToCurrent = (pathname: string) => {
  if (pathname === LEGACY_ADMIN_BASE_PATH) return ADMIN_BASE_PATH;
  if (!pathname.startsWith(`${LEGACY_ADMIN_BASE_PATH}/`)) return pathname;
  return `${ADMIN_BASE_PATH}${pathname.slice(LEGACY_ADMIN_BASE_PATH.length)}`;
};

export const normalizeAdminPathForLegacyRules = (pathname: string) => {
  if (pathname === ADMIN_BASE_PATH) return LEGACY_ADMIN_BASE_PATH;
  if (!pathname.startsWith(`${ADMIN_BASE_PATH}/`)) return pathname;
  return `${LEGACY_ADMIN_BASE_PATH}${pathname.slice(ADMIN_BASE_PATH.length)}`;
};
