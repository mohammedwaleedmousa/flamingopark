const CROPPED_NAME = "flamingo-avatar-cropped.webp";

const installAvatarUploadEnhancer = () => {
  if (typeof document === "undefined" || (window as any).__flamingoAvatarEnhancer) return;
  (window as any).__flamingoAvatarEnhancer = true;

  document.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement | null;
    if (!input || input.type !== "file" || !location.pathname.startsWith("/account")) return;
    const file = input.files?.[0];
    if (!file || file.name === CROPPED_NAME) return;
    if (!file.type.startsWith("image/")) return;

    event.stopImmediatePropagation();
    event.preventDefault();

    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const size = 260;
      let zoom = 1;
      let offsetX = 0;
      let offsetY = 0;
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let originX = 0;
      let originY = 0;

      const overlay = document.createElement("div");
      overlay.dir = "rtl";
      overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(25,18,17,.58);display:flex;align-items:flex-end;justify-content:center;font-family:inherit";
      const panel = document.createElement("div");
      panel.style.cssText = "width:min(100%,440px);background:#fffdfc;border-radius:24px 24px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.16)";
      panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px"><div><div style="font-size:15px;font-weight:700;color:#403230">ضبط الصورة الشخصية</div><div style="font-size:11px;color:#998985;margin-top:4px">حرّك الصورة وكبّرها حتى تناسب الدائرة</div></div><button data-close type="button" style="width:32px;height:32px;border:1px solid #e8deda;border-radius:50%;background:white;font-size:18px;color:#786863">×</button></div><div data-crop style="width:${size}px;height:${size}px;margin:auto;border-radius:50%;overflow:hidden;position:relative;background:#eee5e2;touch-action:none;border:3px solid white;box-shadow:0 0 0 1px #e4ceca"><img data-image draggable="false" style="position:absolute;left:50%;top:50%;max-width:none;user-select:none;pointer-events:none" /></div><div style="display:flex;align-items:center;gap:10px;margin:16px 4px 0"><span style="font-size:14px;color:#8f807b">−</span><input data-zoom type="range" min="1" max="3" step="0.01" value="1" style="flex:1;accent-color:#d4777d"><span style="font-size:14px;color:#8f807b">+</span></div><div style="display:grid;grid-template-columns:1fr 1.35fr;gap:8px;margin-top:14px"><button data-reset type="button" style="height:44px;border:1px solid #e1d5d1;border-radius:12px;background:white;color:#756661;font-size:12px;font-weight:600">إعادة ضبط</button><button data-confirm type="button" style="height:44px;border:0;border-radius:12px;background:#d4777d;color:white;font-size:12px;font-weight:700">اعتماد الصورة</button></div>`;
      overlay.appendChild(panel);
      document.body.appendChild(overlay);
      const oldOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const crop = panel.querySelector("[data-crop]") as HTMLElement;
      const img = panel.querySelector("[data-image]") as HTMLImageElement;
      const slider = panel.querySelector("[data-zoom]") as HTMLInputElement;
      img.src = source;

      const baseScale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
      const clamp = () => {
        const scale = baseScale * zoom;
        const maxX = Math.max(0, (image.naturalWidth * scale - size) / 2);
        const maxY = Math.max(0, (image.naturalHeight * scale - size) / 2);
        offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
        offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
      };
      const render = () => {
        clamp();
        const scale = baseScale * zoom;
        img.style.width = `${image.naturalWidth * scale}px`;
        img.style.height = `${image.naturalHeight * scale}px`;
        img.style.transform = `translate(calc(-50% + ${offsetX}px),calc(-50% + ${offsetY}px))`;
      };
      const close = () => {
        document.body.style.overflow = oldOverflow;
        overlay.remove();
        URL.revokeObjectURL(source);
        input.value = "";
      };
      render();

      slider.addEventListener("input", () => { zoom = Number(slider.value); render(); });
      crop.addEventListener("pointerdown", (e) => { dragging = true; crop.setPointerCapture(e.pointerId); startX = e.clientX; startY = e.clientY; originX = offsetX; originY = offsetY; });
      crop.addEventListener("pointermove", (e) => { if (!dragging) return; offsetX = originX + e.clientX - startX; offsetY = originY + e.clientY - startY; render(); });
      crop.addEventListener("pointerup", () => { dragging = false; });
      crop.addEventListener("pointercancel", () => { dragging = false; });
      panel.querySelector("[data-reset]")?.addEventListener("click", () => { zoom = 1; offsetX = 0; offsetY = 0; slider.value = "1"; render(); });
      panel.querySelector("[data-close]")?.addEventListener("click", close);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      panel.querySelector("[data-confirm]")?.addEventListener("click", () => {
        const output = 512;
        const canvas = document.createElement("canvas");
        canvas.width = output;
        canvas.height = output;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, output, output);
        const ratio = output / size;
        const scale = baseScale * zoom * ratio;
        const w = image.naturalWidth * scale;
        const h = image.naturalHeight * scale;
        ctx.drawImage(image, output / 2 + offsetX * ratio - w / 2, output / 2 + offsetY * ratio - h / 2, w, h);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const cropped = new File([blob], CROPPED_NAME, { type: "image/webp", lastModified: Date.now() });
          const transfer = new DataTransfer();
          transfer.items.add(cropped);
          input.files = transfer.files;
          document.body.style.overflow = oldOverflow;
          overlay.remove();
          URL.revokeObjectURL(source);
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }, "image/webp", 0.86);
      });
    };
    image.onerror = () => { URL.revokeObjectURL(source); input.value = ""; };
    image.src = source;
  }, true);
};

installAvatarUploadEnhancer();

export {};
