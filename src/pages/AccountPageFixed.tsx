import { useEffect } from "react";
import AccountPage from "./AccountPage";
import { supabase } from "@/integrations/supabase/client";

const YEMEN_REGIONS = ["عدن","صنعاء","تعز","حضرموت","إب","الحديدة","ذمار","لحج","أبين","شبوة","المهرة","مأرب","البيضاء","الجوف","صعدة","ريمة","الضالع","حجة","عمران","المحويت"];

const addMessage = (form: HTMLFormElement, message: string, ok = false) => {
  form.querySelector("[data-avatar-runtime-message]")?.remove();
  const p = document.createElement("p");
  p.dataset.avatarRuntimeMessage = "1";
  p.textContent = message;
  p.dir = "rtl";
  p.style.cssText = `margin:8px 0 0;text-align:center;font-size:11px;font-weight:600;color:${ok ? "#527358" : "#B75C5C"}`;
  form.prepend(p);
};

const AccountPageFixed = () => {
  useEffect(() => {
    let pendingAvatar: File | null = null;
    let previewUrl = "";
    let cropOverlay: HTMLDivElement | null = null;

    // AccountPage used overflow:hidden for its sheets. On iOS Safari this makes
    // the visual viewport jump. The sheets already own their scrolling, so keep
    // the document scrollbar stable instead.
    const normalizeBody = () => {
      if (window.location.pathname !== "/account") return;
      if (document.body.style.overflow === "hidden") document.body.style.overflow = "";
      if (document.body.style.position === "fixed" && document.body.dataset.accountScrollLocked === "true") {
        const top = Math.abs(parseInt(document.body.style.top || "0", 10)) || window.scrollY;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.touchAction = "";
        delete document.body.dataset.accountScrollLocked;
        window.scrollTo(0, top);
      }
    };

    normalizeBody();
    const bodyObserver = new MutationObserver(normalizeBody);
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["style", "data-account-scroll-locked"] });

    const openCropper = (file: File, input: HTMLInputElement) => {
      cropOverlay?.remove();
      const sourceUrl = URL.createObjectURL(file);
      const overlay = document.createElement("div");
      cropOverlay = overlay;
      overlay.dir = "rtl";
      overlay.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(30,24,22,.55);display:flex;align-items:flex-end;justify-content:center;padding:0;";
      overlay.innerHTML = `
        <div style="width:100%;max-width:460px;background:#fffdfc;border-radius:24px 24px 0 0;padding:16px 16px calc(env(safe-area-inset-bottom) + 18px);box-shadow:0 -12px 40px rgba(50,35,30,.16)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div><div style="font-size:15px;font-weight:700;color:#403230">ضبط الصورة</div><div style="font-size:10px;color:#9c8e89;margin-top:3px">حرّك الصورة وكبّرها ثم اضغط اعتماد</div></div>
            <button data-close type="button" style="width:32px;height:32px;border:1px solid #e8deda;border-radius:50%;background:white;font-size:18px">×</button>
          </div>
          <div data-stage style="position:relative;margin:0 auto;width:240px;height:240px;border-radius:50%;overflow:hidden;background:#eee5e2;border:3px solid white;box-shadow:inset 0 0 0 1px #e4ceca;touch-action:none">
            <img data-img draggable="false" src="${sourceUrl}" style="position:absolute;left:50%;top:50%;max-width:none;user-select:none;pointer-events:none;transform-origin:center center" />
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:14px"><span>−</span><input data-zoom type="range" min="1" max="3" step="0.01" value="1" style="flex:1;accent-color:#d4777d"><span>+</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px"><button data-reset type="button" style="height:42px;border:1px solid #e1d5d1;border-radius:12px;background:white;color:#756661;font-weight:600">إعادة ضبط</button><button data-confirm type="button" style="height:42px;border:0;border-radius:12px;background:#d4777d;color:white;font-weight:700">اعتماد الصورة</button></div>
        </div>`;
      document.body.appendChild(overlay);

      const img = overlay.querySelector<HTMLImageElement>("[data-img]")!;
      const stage = overlay.querySelector<HTMLElement>("[data-stage]")!;
      const zoomInput = overlay.querySelector<HTMLInputElement>("[data-zoom]")!;
      let zoom = 1;
      let offsetX = 0;
      let offsetY = 0;
      let baseScale = 1;
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let originX = 0;
      let originY = 0;

      const clamp = () => {
        const w = img.naturalWidth * baseScale * zoom;
        const h = img.naturalHeight * baseScale * zoom;
        const maxX = Math.max(0, (w - 240) / 2);
        const maxY = Math.max(0, (h - 240) / 2);
        offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
        offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
      };
      const render = () => {
        clamp();
        const w = img.naturalWidth * baseScale * zoom;
        const h = img.naturalHeight * baseScale * zoom;
        img.style.width = `${w}px`;
        img.style.height = `${h}px`;
        img.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
      };
      img.onload = () => {
        baseScale = Math.max(240 / Math.max(1, img.naturalWidth), 240 / Math.max(1, img.naturalHeight));
        render();
      };
      stage.addEventListener("pointerdown", (e) => { dragging = true; startX = e.clientX; startY = e.clientY; originX = offsetX; originY = offsetY; stage.setPointerCapture(e.pointerId); });
      stage.addEventListener("pointermove", (e) => { if (!dragging) return; offsetX = originX + e.clientX - startX; offsetY = originY + e.clientY - startY; render(); });
      stage.addEventListener("pointerup", () => { dragging = false; });
      stage.addEventListener("pointercancel", () => { dragging = false; });
      zoomInput.addEventListener("input", () => { zoom = Number(zoomInput.value); render(); });
      overlay.querySelector("[data-reset]")?.addEventListener("click", () => { zoom = 1; offsetX = 0; offsetY = 0; zoomInput.value = "1"; render(); });
      const close = () => { URL.revokeObjectURL(sourceUrl); overlay.remove(); if (cropOverlay === overlay) cropOverlay = null; };
      overlay.querySelector("[data-close]")?.addEventListener("click", close);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      overlay.querySelector("[data-confirm]")?.addEventListener("click", async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 512, 512);
        const factor = 512 / 240;
        const drawW = img.naturalWidth * baseScale * zoom * factor;
        const drawH = img.naturalHeight * baseScale * zoom * factor;
        const cx = 256 + offsetX * factor;
        const cy = 256 + offsetY * factor;
        ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .88));
        if (!blob) return;
        pendingAvatar = new File([blob], "avatar.jpg", { type: "image/jpeg", lastModified: Date.now() });
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(blob);
        const form = input.closest("form");
        const preview = form?.querySelector<HTMLImageElement>("img[alt='معاينة الصورة']");
        if (preview) preview.src = previewUrl;
        else {
          const holder = form?.querySelector(".h-\\[82px\\].w-\\[82px\\]");
          if (holder) holder.innerHTML = `<img src="${previewUrl}" alt="معاينة الصورة" style="width:100%;height:100%;object-fit:cover">`;
        }
        close();
      });
    };

    const onChange = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (!(input instanceof HTMLInputElement) || input.type !== "file" || !input.closest("form")) return;
      if (window.location.pathname !== "/account") return;
      const form = input.closest("form");
      if (!form?.textContent?.includes("حفظ التغييرات")) return;
      const file = input.files?.[0];
      if (!file) return;
      event.stopImmediatePropagation();
      event.preventDefault();
      if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
        addMessage(form, "اختر صورة صحيحة");
        return;
      }
      openCropper(file, input);
      input.value = "";
    };

    const onSubmit = async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement) || window.location.pathname !== "/account") return;
      if (!form.textContent?.includes("حفظ التغييرات") || !pendingAvatar) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const submit = form.querySelector<HTMLButtonElement>("button[type='submit']");
      if (submit) { submit.disabled = true; submit.textContent = "جاري حفظ الصورة..."; }
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw new Error("انتهت جلسة الدخول، سجّل الدخول مجددًا");
        const stored = JSON.parse(localStorage.getItem("customer") || "{}") as any;
        const authId = authData.user.id;
        const path = `avatars/${authId}/avatar-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("uploads").upload(path, pendingAvatar, { upsert: false, cacheControl: "31536000", contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(path);
        const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;

        const nameInput = form.querySelector<HTMLInputElement>("input[type='text']");
        const name = nameInput?.value.trim() || stored.name || "";
        const regionButton = Array.from(form.querySelectorAll("button")).find((button) => button.textContent?.includes("المحافظة"));
        const regionText = regionButton?.textContent || "";
        const region = YEMEN_REGIONS.find((item) => regionText.includes(item)) || stored.region || stored.country || "عدن";
        const { data, error } = await (supabase as any).rpc("customer_update_self", {
          _id: stored.id,
          _phone: stored.phone || "",
          _name: name,
          _region: region,
          _avatar_url: avatarUrl,
        });
        if (error) throw error;
        const fresh = Array.isArray(data) && data[0] ? data[0] : { ...stored, name, region, avatar_url: avatarUrl };
        localStorage.setItem("customer", JSON.stringify(fresh));
        addMessage(form, "تم حفظ الصورة بنجاح", true);
        pendingAvatar = null;
        window.setTimeout(() => window.location.reload(), 250);
      } catch (error: any) {
        console.error("avatar upload failed", error);
        addMessage(form, `فشل رفع الصورة: ${error?.message || "حاول مرة أخرى"}`);
        if (submit) { submit.disabled = false; submit.textContent = "حفظ التغييرات"; }
      }
    };

    document.addEventListener("change", onChange, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      bodyObserver.disconnect();
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("submit", onSubmit, true);
      cropOverlay?.remove();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  return <AccountPage />;
};

export default AccountPageFixed;
