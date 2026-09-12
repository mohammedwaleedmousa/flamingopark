import { focusManager } from "@tanstack/react-query";

// Storefront data is already refreshed through scoped realtime invalidations and
// deliberate cache policies. Disabling browser-focus refetches prevents every
// tab switch / app resume from causing a burst of duplicate Supabase requests.
focusManager.setEventListener(() => {
  return () => undefined;
});
