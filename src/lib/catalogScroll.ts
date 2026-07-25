export const catalogScrollKey = (path: string) => `flamingopark:catalog-scroll:${path}`;

export const saveCatalogScroll = (path: string) => {
  sessionStorage.setItem(catalogScrollKey(path), String(window.scrollY));
};

export const clearCatalogScroll = (path: string) => {
  sessionStorage.removeItem(catalogScrollKey(path));
};

export const restoreCatalogScroll = (path: string) => {
  const key = catalogScrollKey(path);
  const saved = sessionStorage.getItem(key);
  if (!saved) return;
  const top = Number(saved);
  sessionStorage.removeItem(key);
  if (!Number.isFinite(top)) return;
  requestAnimationFrame(() => window.scrollTo({ top, left: 0, behavior: "auto" }));
};
