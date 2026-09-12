import { focusManager, onlineManager } from "@tanstack/react-query";

// Storefront data is refreshed through scoped realtime invalidations and
// deliberate cache policies. Disabling browser-focus refetches prevents every
// tab switch / app resume from causing a burst of duplicate Supabase requests.
focusManager.setEventListener(() => {
  return () => undefined;
});

// Mobile networks may flap between online/offline states several times while a
// customer is browsing or checking out. React Query's default reconnect event
// can refetch many active queries at once. Keep the current cache stable and let
// explicit invalidations / user actions fetch fresh data instead.
onlineManager.setEventListener(() => {
  return () => undefined;
});
