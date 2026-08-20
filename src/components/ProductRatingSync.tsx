import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";

type ReviewSummary = {
  reviewCount: number;
  averageRating: number;
};

const ProductRatingSync = () => {
  useEffect(() => {
    const cache = new Map<string, ReviewSummary>();
    let disposed = false;
    let syncing = false;

    const getProductSlug = () => {
      const match = window.location.pathname.match(/^\/product\/([^/?#]+)/);
      return match?.[1] ? decodeURIComponent(match[1]) : null;
    };

    const findRatingBlock = () => {
      const countSpan = Array.from(document.querySelectorAll<HTMLSpanElement>("span")).find((span) => span.textContent?.trim() === "(128 تقييم)");
      if (!countSpan) return null;

      const ratingSpan = countSpan.previousElementSibling as HTMLSpanElement | null;
      const starsContainer = ratingSpan?.previousElementSibling as HTMLElement | null;

      if (!ratingSpan || !starsContainer) return null;

      return { countSpan, ratingSpan, starsContainer };
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

    const applySummary = async () => {
      if (disposed || syncing) return;

      const slug = getProductSlug();
      if (!slug) return;

      const block = findRatingBlock();
      if (!block) return;

      syncing = true;

      try {
        const summary = await loadSummary(slug);
        if (disposed) return;

        const currentBlock = findRatingBlock() || block;
        const roundedRating = Math.round(summary.averageRating);
        const stars = currentBlock.starsContainer.querySelectorAll<SVGElement>("svg");

        stars.forEach((star, index) => {
          const active = summary.reviewCount > 0 && index < roundedRating;
          star.style.fill = active ? "#DCA653" : "transparent";
          star.style.color = active ? "#DCA653" : "#D8D0CD";
        });

        currentBlock.ratingSpan.textContent = summary.reviewCount > 0 ? summary.averageRating.toFixed(1) : "—";
        currentBlock.countSpan.textContent = `(${summary.reviewCount} تقييم)`;
        currentBlock.countSpan.setAttribute("data-real-product-rating", slug);
      } catch (error) {
        console.error("Unable to load real product rating:", error);
      } finally {
        syncing = false;
      }
    };

    const observer = new MutationObserver(() => {
      void applySummary();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    void applySummary();

    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, []);

  return null;
};

export default ProductRatingSync;
