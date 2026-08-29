export type BannerScheduleWindow = {
  starts_at?: string | null;
  ends_at?: string | null;
};

export const isBannerCurrentlyVisible = (banner: BannerScheduleWindow, now = Date.now()) => {
  const start = banner.starts_at ? new Date(banner.starts_at).getTime() : null;
  const end = banner.ends_at ? new Date(banner.ends_at).getTime() : null;

  if (start !== null && Number.isFinite(start) && start > now) return false;
  if (end !== null && Number.isFinite(end) && end < now) return false;
  return true;
};
