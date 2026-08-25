import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

type ReviewSummary = {
  reviewCount: number;
  averageRating: number;
};

type RatingBlock = {
  countSpan: HTMLSpanElement;
  ratingSpan: HTMLSpanElement;
  starsContainer: HTMLElement;
  container: HTMLElement;
};

const ProductRatingSync = () => {
  useEffect(() => {
    const cache = new Map<string, ReviewSummary>();
    let disposed = false;
    let observer: MutationObserver | null = null;
    let activeSlug: string | null = null;
    let syncVersion = 0;

    const getProductSlug = () => {
      const match = window.location.pathname.match(/^\/product\/([^/?#]+)/);
      return match?.[1] ? decodeURIComponent(match[1]) : null;
    };

    const findRatingBlock = (): RatingBlock | null => {
      const countSpan = Array.from(document.querySelectorAll<HTMLSpanElement>("span")).find((span) => span.textContent?.trim() === "(128 تقييم)");
      if (!countSpan) return null;

      const ratingSpan = countSpan.previousElementSibling as HTMLSpanElement | null;
      const starsContainer = ratingSpan?.previousElementSibling as HTMLElement | null;
      const container = starsContainer?.parentElement as HTMLElement | null;

      if (!ratingSpan || !starsContainer || !container) return null;
      return { countSpan, ratingSpan, starsContainer, container };
    };

    const hideDefaultRating = (block: RatingBlock) => {
      block.container.style.visibility = "hidden";
    };

    const showNeutralRating = (block: RatingBlock) => {
      block.starsContainer.querySelectorAll<SVGElement>("svg").forEach((star) => {
        star.style.fill = "transparent";
        star.style.color = "#D8D0CD";
      });
      block.ratingSpan.textContent = "—";
      block.countSpan.textContent = "(0 تقييم)";
      block.container.style.visibility = "visible";
    };

    const loadSummary = async (slug: string): Promise<ReviewSummary> => {
      const cached = cache.get(slug);
      if (cached) return cached;

      const { data: product, error: productError } = await supabase.from("products").select("id").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (productError) throw productError;
      if (!product?.id) return { reviewCount: 0, averageRating: 0 };

      const { data, error } = await (supabase as any).rpc("get_product_review_summary", { p_product_id: product.id });
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const summary = {
        reviewCount: Number(row?.review_count || 0),
        averageRating: Number(row?.average_rating || 0),
      };

      cache.set(slug, summary);
      return summary;
    };

    const applySummary = async (slug: string, block: RatingBlock, version: number) => {
      try {
        const summary = await loadSummary(slug);
        if (disposed || version !== syncVersion || slug !== activeSlug) return;

        const roundedRating = Math.round(summary.averageRating);
        block.starsContainer.querySelectorAll<SVGElement>("svg").forEach((star, index) => {
          const active = summary.reviewCount > 0 && index < roundedRating;
          star.style.fill = active ? "#DCA653" : "transparent";
          star.style.color = active ? "#DCA653" : "#D8D0CD";
        });

        block.ratingSpan.textContent = summary.reviewCount > 0 ? summary.averageRating.toFixed(1) : "—";
        block.countSpan.textContent = `(${summary.reviewCount} تقييم)`;
        block.countSpan.setAttribute("data-real-product-rating", slug);
        block.container.style.visibility = "visible";
      } catch (error) {
        console.error("Unable to load real product rating:", error);
        if (!disposed && version === syncVersion && slug === activeSlug) showNeutralRating(block);
      }
    };

    const syncCurrentRoute = () => {
      const slug = getProductSlug();
      if (slug === activeSlug) return;

      activeSlug = slug;
      syncVersion += 1;
      const version = syncVersion;

      observer?.disconnect();
      observer = null;

      if (!slug) return;

      const attach = () => {
        if (disposed || version !== syncVersion || slug !== activeSlug) return false;

        const block = findRatingBlock();
        if (!block) return false;

        hideDefaultRating(block);
        observer?.disconnect();
        observer = null;
        void applySummary(slug, block, version);
        return true;
      };

      if (attach()) return;

      observer = new MutationObserver(() => {
        attach();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };

    const handleNavigation = () => {
      window.setTimeout(syncCurrentRoute, 0);
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        handleNavigation();
      } catch {
        return;
      }
    };

    document.addEventListener("click", handleDocumentClick);
    window.addEventListener("popstate", handleNavigation);
    syncCurrentRoute();

    return () => {
      disposed = true;
      observer?.disconnect();
      document.removeEventListener("click", handleDocumentClick);
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  return null;
};

export default ProductRatingSync;
