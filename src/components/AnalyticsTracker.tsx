import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { captureUTM, track } from "@/lib/analytics";

/**
 * Fires a page_view event on every route change.
 * Skips the /admin area (internal traffic) to keep reports clean.
 */
const AnalyticsTracker = () => {
  const { pathname, search } = useLocation();
  const last = useRef<string>("");

  useEffect(() => {
    captureUTM();
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const key = pathname + search;
    if (key === last.current) return;
    last.current = key;
    track({ event_type: "page_view", path: pathname });
  }, [pathname, search]);

  return null;
};

export default AnalyticsTracker;