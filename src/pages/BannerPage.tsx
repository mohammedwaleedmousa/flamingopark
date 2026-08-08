import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";

type BannerPageRow = {
  id: string;
  title_ar: string;
  subtitle_ar: string | null;
  image_url: string;
  page_slug: string | null;
  page_title_ar: string | null;
  page_content_ar: string | null;
  cta_text_ar: string | null;
  cta_link: string | null;
};

const BannerPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: banner, isLoading } = useQuery({
    queryKey: ["banner-page", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("banners")
        .select("id,title_ar,subtitle_ar,image_url,page_slug,page_title_ar,page_content_ar,cta_text_ar,cta_link")
        .eq("page_slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as BannerPageRow | null;
    },
  });

  if (!slug) return <Navigate to="/home" replace />;
  if (!isLoading && !banner) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pb-20 pt-16 md:pt-20">
        {isLoading || !banner ? (
          <div className="min-h-[60vh] animate-pulse bg-muted" />
        ) : (
          <>
            <section className="relative min-h-[48svh] overflow-hidden bg-neutral-900">
              <img src={banner.image_url} alt={banner.title_ar} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/55" />
              <div className="relative mx-auto flex min-h-[48svh] max-w-5xl flex-col justify-end px-5 py-12 text-white">
                <Link to="/home" className="mb-auto inline-flex w-fit items-center gap-1 text-sm text-white/80 hover:text-white">
                  <ChevronRight className="h-4 w-4" />
                  الرئيسية
                </Link>
                <h1 className="mt-3 font-heading text-4xl md:text-6xl">{banner.page_title_ar || banner.title_ar}</h1>
                {banner.subtitle_ar && <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 md:text-base">{banner.subtitle_ar}</p>}
              </div>
            </section>

            <section className="container mx-auto max-w-3xl px-5 py-14">
              {banner.page_content_ar ? (
                <div className="space-y-5 text-base leading-9 text-foreground/85">
                  {banner.page_content_ar.split("\n").filter((line) => line.trim()).map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-muted-foreground">سيتم إضافة محتوى هذه الصفحة قريبًا.</p>
              )}

              {banner.cta_link && (
                <Link to={banner.cta_link} className="mt-10 inline-flex border-b border-foreground pb-2 text-sm hover:text-primary">
                  {banner.cta_text_ar || "تسوق الآن"}
                </Link>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BannerPage;