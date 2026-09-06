let installed = false;

export const installAccountStableScroll = () => {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  const body = document.body;
  let locked = false;
  let scrollY = 0;
  let unlockFrame = 0;
  let unlockFrame2 = 0;
  let previous: Record<string, string> | null = null;

  const isAccountPage = () => window.location.pathname === "/account";

  const cancelPendingUnlock = () => {
    if (unlockFrame) window.cancelAnimationFrame(unlockFrame);
    if (unlockFrame2) window.cancelAnimationFrame(unlockFrame2);
    unlockFrame = 0;
    unlockFrame2 = 0;
  };

  const lock = () => {
    if (locked || !isAccountPage()) return;
    cancelPendingUnlock();
    scrollY = window.scrollY || window.pageYOffset || 0;
    previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      touchAction: body.style.touchAction,
    };

    locked = true;
    body.dataset.accountScrollLocked = "true";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
  };

  const unlockNow = () => {
    if (!locked) return;
    const savedScrollY = scrollY;
    const saved = previous;

    locked = false;
    previous = null;
    delete body.dataset.accountScrollLocked;

    body.style.position = saved?.position || "";
    body.style.top = saved?.top || "";
    body.style.left = saved?.left || "";
    body.style.right = saved?.right || "";
    body.style.width = saved?.width || "";
    body.style.overflow = saved?.overflow === "hidden" ? "" : saved?.overflow || "";
    body.style.touchAction = saved?.touchAction || "";

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollY, left: 0, behavior: "auto" });
    });
  };

  const scheduleUnlock = () => {
    if (!locked) return;
    cancelPendingUnlock();

    // AccountPage briefly restores overflow while switching between nested
    // sheets (profile -> region/avatar). Waiting two frames prevents Safari
    // from painting that transient unlocked state and causing a visible jump.
    unlockFrame = window.requestAnimationFrame(() => {
      unlockFrame2 = window.requestAnimationFrame(() => {
        unlockFrame = 0;
        unlockFrame2 = 0;
        if (body.style.overflow === "hidden" && isAccountPage()) return;
        unlockNow();
      });
    });
  };

  const sync = () => {
    if (!isAccountPage()) {
      if (locked) unlockNow();
      return;
    }

    if (body.style.overflow === "hidden") {
      if (!locked) lock();
      else cancelPendingUnlock();
      return;
    }

    scheduleUnlock();
  };

  const observer = new MutationObserver(sync);
  observer.observe(body, { attributes: true, attributeFilter: ["style"] });

  window.addEventListener("popstate", sync);
  window.addEventListener("pageshow", sync);
};

installAccountStableScroll();
