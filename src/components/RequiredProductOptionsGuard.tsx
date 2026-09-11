import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { toast } from "@/hooks/use-toast";

type RequiredProductOptionsGuardProps = {
  children: ReactNode;
};

const normalizeText = (value?: string | null) => String(value || "").replace(/\s+/g, " ").trim();

const findOptionSection = (label: Element) => {
  let node: HTMLElement | null = label.parentElement;

  for (let depth = 0; node && depth < 5; depth += 1, node = node.parentElement) {
    if (node.querySelector("button")) return node;
  }

  return null;
};

const RequiredProductOptionsGuard = ({ children }: RequiredProductOptionsGuardProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [colorChosen, setColorChosen] = useState(false);
  const [sizeChosen, setSizeChosen] = useState(false);

  useEffect(() => {
    setColorChosen(false);
    setSizeChosen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const markSections = () => {
      root.querySelectorAll<HTMLElement>("[data-required-option-kind]").forEach((element) => {
        element.removeAttribute("data-required-option-kind");
        element.removeAttribute("data-required-option-pending");
      });

      const labels = Array.from(root.querySelectorAll<HTMLElement>("span,p,h2,h3"));

      for (const label of labels) {
        const text = normalizeText(label.textContent);
        const kind = text === "اللون" ? "color" : text === "المقاس" || text === "المقاسات" ? "size" : null;
        if (!kind) continue;

        const section = findOptionSection(label);
        if (!section) continue;

        section.dataset.requiredOptionKind = kind;
        section.dataset.requiredOptionPending = kind === "color" ? String(!colorChosen) : String(!sizeChosen);

        if (kind === "color" && !colorChosen) {
          const statusSpans = Array.from(section.querySelectorAll<HTMLElement>("span"));
          const status = statusSpans.find((span) => {
            const value = normalizeText(span.textContent);
            return value.startsWith("—") && value !== "— اختر اللون";
          });
          if (status) status.textContent = "— اختر اللون";
        }
      }
    };

    markSections();
    const observer = new MutationObserver(markSections);
    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [colorChosen, sizeChosen, location.pathname, location.search]);

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button") as HTMLButtonElement | null;
    if (!button) return;

    const colorSection = button.closest<HTMLElement>('[data-required-option-kind="color"]');
    if (colorSection) {
      setColorChosen(true);
      setSizeChosen(false);
      return;
    }

    const sizeSection = button.closest<HTMLElement>('[data-required-option-kind="size"]');
    if (sizeSection) {
      setSizeChosen(true);
      return;
    }

    const actionText = normalizeText(button.textContent);
    const isCartAction = actionText.includes("أضف") && actionText.includes("السلة") || actionText.includes("إضافة للسلة") || actionText.includes("اشتري الآن");
    if (!isCartAction) return;

    const root = rootRef.current;
    if (!root) return;

    const requiresColor = Boolean(root.querySelector('[data-required-option-kind="color"]'));
    const requiresSize = Boolean(root.querySelector('[data-required-option-kind="size"]'));

    if (requiresColor && !colorChosen) {
      event.preventDefault();
      event.stopPropagation();
      toast({
        title: "اختر اللون أولاً",
        description: "يجب تحديد اللون قبل إضافة المنتج إلى السلة.",
        variant: "destructive",
      });
      return;
    }

    if (requiresSize && !sizeChosen) {
      event.preventDefault();
      event.stopPropagation();
      toast({
        title: "اختر المقاس أولاً",
        description: "يجب تحديد المقاس قبل إضافة المنتج إلى السلة.",
        variant: "destructive",
      });
    }
  };

  return (
    <div ref={rootRef} onClickCapture={handleClickCapture} className="contents">
      <style>{`
        [data-required-option-kind="color"][data-required-option-pending="true"] button {
          box-shadow: 0 0 0 1px #dfd4d0 !important;
        }
        [data-required-option-kind="color"][data-required-option-pending="true"] button svg {
          display: none !important;
        }
      `}</style>
      {children}
    </div>
  );
};

export default RequiredProductOptionsGuard;
