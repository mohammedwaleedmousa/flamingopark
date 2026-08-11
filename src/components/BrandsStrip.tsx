import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import { supabase } from "@/integrations/supabase/client";

import "swiper/css";

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  countries: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface BrandViewModel {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

const BrandsStrip = ({ enabled = true }: { enabled?: boolean }) => {
  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id,name,logo_url,countries,is_active,sort_order,slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return (data || []) as BrandRow[];
    },
  });

  const renderBrands: BrandViewModel[] = useMemo(
    () =>
      brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug || brand.name.toLowerCase().replace(/\s+/g, "-"),
        logo_url: brand.logo_url,
      })),
    [brands]
  );

  return (
    <section className="brands-luxury-strip" dir="rtl" aria-label="الماركات">
      <style>
        {`
          .brands-luxury-strip {
            --text: #241D20;
            --muted: #8C8186;
            --line: #EEE8EB;
            --pink: #E85A91;

            background: #fff;
            padding: 26px 0 22px;
          }

          .brands-luxury-strip .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }

          .brands-luxury-strip .title {
            margin: 0;
            color: var(--text);
            font-size: 18px;
            font-weight: 700;
          }

          .brands-luxury-strip .view-all {
            color: var(--muted);
            text-decoration: none;
            font-size: 11px;
            font-weight: 600;
          }

          .brands-luxury-strip .view-all:hover {
            color: var(--pink);
          }

          .brands-luxury-strip .swiper {
            overflow: hidden;
            touch-action: pan-y;
          }

          .brands-luxury-strip .swiper-wrapper {
            touch-action: pan-y;
          }

          .brands-luxury-strip .swiper-slide {
            width: 112px;
          }

          .brands-luxury-strip .brand {
            position: relative;

            display: flex;
            min-height: 92px;
            width: 100%;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            padding: 12px 8px 14px;

            color: inherit;
            text-decoration: none;

            -webkit-tap-highlight-color: transparent;
          }

          .brands-luxury-strip .brand::after {
            content: "";
            position: absolute;
            right: 22%;
            bottom: 0;
            left: 22%;

            height: 1px;
            border-radius: 999px;

            background: var(--line);
          }

          .brands-luxury-strip .logo {
            display: flex;
            height: 38px;
            width: 72px;
            align-items: center;
            justify-content: center;
          }

          .brands-luxury-strip .logo img {
            display: block;
            max-width: 100%;
            max-height: 30px;
            object-fit: contain;
          }

          .brands-luxury-strip .fallback {
            color: var(--text);
            font-size: 11px;
            font-weight: 700;
            text-align: center;
          }

          .brands-luxury-strip .name {
            margin-top: 10px;

            color: #51484C;

            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.01em;

            text-align: center;
            white-space: nowrap;
          }

          @media (hover: hover) {
            .brands-luxury-strip .brand:hover .name {
              color: var(--pink);
            }

            .brands-luxury-strip .brand:hover::after {
              height: 2px;
              background: var(--pink);
            }
          }

          .brands-luxury-strip .brand:active .name {
            color: var(--pink);
          }

          .brands-luxury-strip .brand:active::after {
            height: 2px;
            background: var(--pink);
          }

          @media (min-width: 640px) {
            .brands-luxury-strip {
              padding: 30px 0 26px;
            }

            .brands-luxury-strip .title {
              font-size: 20px;
            }

            .brands-luxury-strip .swiper-slide {
              width: 138px;
            }

            .brands-luxury-strip .brand {
              min-height: 106px;
            }

            .brands-luxury-strip .logo {
              width: 88px;
              height: 42px;
            }

            .brands-luxury-strip .logo img {
              max-height: 34px;
            }

            .brands-luxury-strip .name {
              font-size: 12px;
            }
          }
        `}
      </style>

      <div className="container mx-auto px-4 md:px-8">
        <div className="header">
          <h2 className="title">الماركات</h2>
          <Link to="/brands" className="view-all">
            عرض جميع الماركات
          </Link>
        </div>

        <Swiper
          modules={[FreeMode]}
          slidesPerView="auto"
          spaceBetween={4}
          freeMode={{ enabled: true, momentum: true }}
          touchStartPreventDefault={false}
          touchReleaseOnEdges
          resistanceRatio={0}
          threshold={4}
          grabCursor
        >
          {renderBrands.map((brand) => (
            <SwiperSlide key={brand.id}>
              <Link
                to={`/brands/${brand.slug}`}
                className="brand"
                aria-label={`عرض منتجات ${brand.name}`}
              >
                <div className="logo">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="fallback">{brand.name}</span>
                  )}
                </div>

                <span className="name">{brand.name}</span>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default BrandsStrip;