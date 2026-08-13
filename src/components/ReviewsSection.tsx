import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Quote, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { getSiteText, useSiteContent } from "@/hooks/useSiteContent";

interface Review {
  id: string;
  customer_name: string;
  message: string;
  message_ar: string | null;
  rating: number;
  country: string;
}

const ReviewsSection = () => {
  const { data: content } = useSiteContent("reviews_section_");

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("id,customer_name,message,message_ar,rating,country").eq("is_approved", true).order("created_at", { ascending: false }).limit(6);

      if (error) throw error;

      return (data || []) as Review[];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["reviews-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", true);

      if (error) throw error;

      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  if (reviews.length === 0) return null;

  return (
    <section className="border-y border-[#F0E6E2] bg-[#FFFDFC] py-7 md:py-12" dir="rtl">
      <div className="mx-auto w-full max-w-[1200px] px-3 md:px-6">
        {/* HEADER */}
        <div className="mb-5 flex items-end justify-between gap-4 md:mb-7">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
              <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">CUSTOMER STORIES</span>
            </div>

            <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-[#403633] md:text-[23px]">آراء عملائنا</h2>

            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex items-center gap-[1px]" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-2.5 w-2.5 fill-[#DCA653] text-[#DCA653]" strokeWidth={1} />
                ))}
              </div>

              <span className="text-[7px] text-[#9B8D88]">{totalCount} تقييم من عملائنا</span>
            </div>
          </div>

          <Link to="/reviews" className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-[#E2D6D2] bg-white px-3 text-[7px] font-semibold text-[#A95B61] active:bg-[#FFF7F5]">
            عرض الكل
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        </div>

        {/* REVIEWS */}
        <div className="grid grid-cols-1 overflow-hidden rounded-[16px] border border-[#EAE0DC] bg-white sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <article key={review.id} className={`relative flex min-h-[150px] flex-col px-4 py-4 md:min-h-[175px] md:px-5 md:py-5 ${index !== reviews.length - 1 ? "border-b border-[#F0E8E5] sm:border-b-0" : ""} ${index % 2 === 0 && index !== reviews.length - 1 ? "sm:border-l sm:border-[#F0E8E5]" : ""} ${index < 3 ? "lg:border-b lg:border-[#F0E8E5]" : ""} ${index % 3 !== 2 ? "lg:border-l lg:border-[#F0E8E5]" : "lg:border-l-0"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-[1px]" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`h-3 w-3 ${star <= review.rating ? "fill-[#DCA653] text-[#DCA653]" : "text-[#DDD4D0]"}`} strokeWidth={1.1} />
                  ))}
                </div>

                <Quote className="h-4 w-4 rotate-180 stroke-[1.3] text-[#E4C9C5]" />
              </div>

              <p className="mt-3 line-clamp-4 flex-1 text-[9px] leading-6 text-[#62544F] md:text-[10px] md:leading-7">{review.message_ar || review.message}</p>

              <div className="mt-3 border-t border-[#F1EAE7] pt-3">
                <p className="truncate text-[8px] font-semibold text-[#4C403C] md:text-[9px]">{review.customer_name}</p>

                {review.country && <p className="mt-0.5 text-[6px] uppercase tracking-[0.08em] text-[#AAA09B]">{review.country}</p>}
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-[#EEE4E0] pt-5 sm:flex-row">
          <div className="text-center sm:text-right">
            <p className="text-[10px] font-semibold text-[#4A3D39]">{getSiteText(content, "share_experience", "شارك تجربتك معنا")}</p>
            <p className="mt-1 text-[7px] text-[#9E908B]">رأيك يساعد الآخرين على اختيار المنتج المناسب.</p>
          </div>

          <Link to="/reviews" className="flex h-[39px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#D4777D] px-5 text-[8px] font-semibold text-white active:bg-[#C96B72] sm:w-auto">
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
            {getSiteText(content, "write_review", "اكتب تقييماً")}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;