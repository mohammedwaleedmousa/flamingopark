if (typeof window !== "undefined" && typeof Element !== "undefined" && window.location.pathname.startsWith("/admin")) {
  const prototype = Element.prototype as Element & { __flamingoAdminClosestPatched?: boolean };

  if (!prototype.__flamingoAdminClosestPatched) {
    const nativeClosest = Element.prototype.closest;

    Element.prototype.closest = function closest(selector: string) {
      if (selector === "div.rounded-[16px]") {
        let current: Element | null = this;

        while (current) {
          if (current.tagName === "DIV" && current.classList.contains("rounded-[16px]")) return current;
          current = current.parentElement;
        }

        return null;
      }

      return nativeClosest.call(this, selector);
    };

    Object.defineProperty(Element.prototype, "__flamingoAdminClosestPatched", {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  }
}
