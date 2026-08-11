import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import { ArrowLeft } from "phosphor-react";
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
  countries: string[];
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
        slug:
          brand.slug ||
          brand.name.toLowerCase().replace(/\s+/g, "-"),
        logo_url: brand.logo_url,
        countries: brand.countries || [],
      })),
    [brands]
  );

  return (
    <section
      className="brand-editorial"
      dir="rtl"
      aria-label="الماركات"
    >
      <style>
        {`
          .brand-editorial {
            --pink: #E85A91;
            --pink-soft: #FFF4F8;
            --pink-border: #F5DDE7;

            width: 100%;
            overflow: hidden;
            background: #FFFFFF;

            padding: 24px 0 20px;
          }

          /* =========================
             HEADER
          ========================= */

          .brand-editorial .brand-header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;

            margin-bottom: 16px;
          }

          .brand-editorial .heading {
            display: flex;
            flex-direction: column;
          }

          .brand-editorial .eyebrow {
            margin-bottom: 3px;

            color: var(--pink);

            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.04em;
          }

          .brand-editorial .title {
            margin: 0;

            color: #211A1D;

            font-size: 18px;
            font-weight: 800;
            line-height: 1.35;
          }

          .brand-editorial .view-all {
            display: inline-flex;
            align-items: center;
            gap: 4px;

            color: #8B7F84;

            text-decoration: none;

            font-size: 11px;
            font-weight: 600;
          }

          .brand-editorial .view-all svg {
            width: 13px;
            height: 13px;
          }

          /* =========================
             SWIPER
          ========================= */

          .brand-editorial .swiper {
            overflow: visible;
            touch-action: pan-y;
          }

          .brand-editorial .swiper-wrapper {
            touch-action: pan-y;
          }

          .brand-editorial .swiper-slide {
            width: 164px;
          }

          /* =========================
             CARD
          ========================= */

          .brand-editorial .brand-card {
            position: relative;

            display: flex;
            height: 116px;
            width: 100%;
            flex-direction: column;
            justify-content: space-between;

            overflow: hidden;

            border: 1px solid #EFEAEC;
            border-radius: 20px;

            background: #FCFBFC;

            padding: 15px;

            color: inherit;
            text-decoration: none;

            -webkit-tap-highlight-color: transparent;
          }

          /* subtle pink shape */

          .brand-editorial .brand-card::before {
            content: "";

            position: absolute;
            top: -34px;
            left: -28px;

            width: 88px;
            height: 88px;

            border-radius: 50%;

            background: #FFF0F5;
          }

          /* =========================
             TOP
          ========================= */

          .brand-editorial .brand-top {
            position: relative;
            z-index: 2;

            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }

          .brand-editorial .number {
            color: #C7BEC2;

            font-size: 9px;
            font-weight: 700;

            font-variant-numeric: tabular-nums;
          }

          .brand-editorial .mini-logo {
            display: flex;
            width: 30px;
            height: 30px;
            align-items: center;
            justify-content: center;

            overflow: hidden;

            border: 1px solid #F0EAED;
            border-radius: 9px;

            background: #FFFFFF;
          }

          .brand-editorial .mini-logo img {
            display: block;

            max-width: 72%;
            max-height: 72%;

            object-fit: contain;
          }

          .brand-editorial .logo-letter {
            color: var(--pink);

            font-size: 12px;
            font-weight: 800;
          }

          /* =========================
             BRAND INFO
          ========================= */

          .brand-editorial .brand-info {
            position: relative;
            z-index: 2;

            min-width: 0;
          }

          .brand-editorial .brand-name {
            display: block;

            overflow: hidden;

            color: #282023;

            font-size: 16px;
            font-weight: 800;
            line-height: 1.25;

            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .brand-editorial .brand-meta {
            display: flex;
            align-items: center;
            gap: 5px;

            margin-top: 5px;

            color: #968A8F;

            font-size: 9px;
            font-weight: 500;
          }

          .brand-editorial .brand-dot {
            width: 4px;
            height: 4px;

            flex-shrink: 0;

            border-radius: 50%;

            background: var(--pink);
          }

          /* =========================
             HOVER
          ========================= */

          @media (hover: hover) {
            .brand-editorial .brand-card:hover {
              border-color: #F1CEDC;
              background: #FFF9FB;
            }

            .brand-editorial .brand-card:hover .brand-name {
              color: var(--pink);
            }

            .brand-editorial .view-all:hover {
              color: var(--pink);
            }
          }

          .brand-editorial .brand-card:active {
            border-color: #EFC6D6;
            background: var(--pink-soft);
          }

          /* =========================
             TABLET
          ========================= */

          @media (min-width: 640px) {
            .brand-editorial {
              padding: 28px 0 24px;
            }

            .brand-editorial .brand-header {
              margin-bottom: 20px;
            }

            .brand-editorial .title {
              font-size: 20px;
            }

            .brand-editorial .swiper-slide {
              width: 190px;
            }

            .brand-editorial .brand-card {
              height: 130px;
              padding: 17px;
            }

            .brand-editorial .brand-name {
              font-size: 18px;
            }
          }

          /* =========================
             DESKTOP
          ========================= */

          @media (min-width: 1024px) {
            .brand-editorial {
              padding: 32px 0 28px;
            }

            .brand-editorial .swiper-slide {
              width: 210px;
            }

            .brand-editorial .brand-card {
              height: 140px;
            }
          }
        `}
      </style>

      <div className="container mx-auto px-4 md:px-8">

        {/* HEADER */}
        <div className="brand-header">
          <div className="heading">
            <span className="eyebrow">
              BRANDS
            </span>

            <h2 className="title">
              اكتشفي الماركات
            </h2>
          </div>

          <Link
            to="/brands"
            className="view-all"
          >
            عرض الكل

            <ArrowLeft
              size={13}
              weight="bold"
            />
          </Link>
        </div>

        {/* BRANDS */}
        <Swiper
          modules={[FreeMode]}
          slidesPerView="auto"
          spaceBetween={10}
          freeMode={{
            enabled: true,
            momentum: true,
          }}
          touchStartPreventDefault={false}
          touchReleaseOnEdges
          resistanceRatio={0}
          threshold={4}
          grabCursor
        >
          {renderBrands.map((brand, index) => (
            <SwiperSlide key={brand.id}>
              <Link
                to={`/brands/${brand.slug}`}
                className="brand-card"
                aria-label={`عرض منتجات ${brand.name}`}
              >

                {/* TOP */}
                <div className="brand-top">

                  <span className="mini-logo">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="logo-letter">
                        {brand.name.charAt(0)}
                      </span>
                    )}
                  </span>

                  <span className="number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* INFO */}
                <div className="brand-info">
                  <span className="brand-name">
                    {brand.name}
                  </span>

                  <div className="brand-meta">
                    <span className="brand-dot" />

                    <span>
                      {brand.countries.length > 0
                        ? brand.countries[0]
                        : "تسوقي الماركة"}
                    </span>
                  </div>
                </div>

              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default BrandsStrip;