type CatalogScrollSnapshot = {
  top: number;
  productId?: string;
};

export const catalogScrollKey = (path: string) => `flamingopark:catalog-scroll:${path}`;

const parseCatalogScroll = (saved: string): CatalogScrollSnapshot | null => {
  try {
    const parsed = JSON.parse(saved) as Partial<CatalogScrollSnapshot>;
    const top = Number(parsed?.top);

    if (Number.isFinite(top)) {
      return {
        top: Math.max(0, top),
        productId: typeof parsed.productId === "string" && parsed.productId ? parsed.productId : undefined,
      };
    }
  } catch {
    // Backwards compatibility with the old numeric session value.
  }

  const legacyTop = Number(saved);

  return Number.isFinite(legacyTop)
    ? { top: Math.max(0, legacyTop) }
    : null;
};

export const saveCatalogScroll = (path: string, productId?: string) => {
  const snapshot: CatalogScrollSnapshot = {
    top: window.scrollY,
    productId,
  };

  sessionStorage.setItem(catalogScrollKey(path), JSON.stringify(snapshot));
};

export const clearCatalogScroll = (path: string) => {
  sessionStorage.removeItem(catalogScrollKey(path));
};

const findLoadMoreButton = () => {
  const grid = document.getElementById("products-grid");

  if (!grid) return null;

  return (
    Array.from(grid.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("عرض المزيد"),
    ) || null
  );
};

export const restoreCatalogScroll = (path: string) => {
  const key = catalogScrollKey(path);
  const saved = sessionStorage.getItem(key);

  if (!saved) return;

  const snapshot = parseCatalogScroll(saved);

  if (!snapshot) {
    sessionStorage.removeItem(key);
    return;
  }

  let attempts = 0;
  let missingLoadMoreAttempts = 0;

  const finishRestore = () => {
    sessionStorage.removeItem(key);

    requestAnimationFrame(() => {
      window.scrollTo({ top: snapshot.top, left: 0, behavior: "auto" });

      // Images/cards can settle a frame later; apply the saved position once more.
      requestAnimationFrame(() => {
        window.scrollTo({ top: snapshot.top, left: 0, behavior: "auto" });
      });
    });
  };

  const attemptRestore = () => {
    attempts += 1;

    const productAnchor = snapshot.productId
      ? document.querySelector<HTMLElement>(`[data-catalog-product-id="${snapshot.productId}"]`)
      : null;

    const maxScrollTop = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );

    // Restore only after the original product (preferred) or enough page height exists.
    if (productAnchor || maxScrollTop >= snapshot.top - 24) {
      finishRestore();
      return;
    }

    const loadMoreButton = findLoadMoreButton();

    if (loadMoreButton) {
      missingLoadMoreAttempts = 0;

      if (!loadMoreButton.disabled) {
        loadMoreButton.click();
      }
    } else {
      missingLoadMoreAttempts += 1;
    }

    // Avoid an endless loop if the catalog changed or there is nothing else to load.
    if (attempts >= 120 || missingLoadMoreAttempts >= 8) {
      finishRestore();
      return;
    }

    window.setTimeout(attemptRestore, 140);
  };

  requestAnimationFrame(attemptRestore);
};
