import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
        slug:
          brand.slug ||
          brand.name.toLowerCase().replace(/\s+/g, "-"),
        logo_url: brand.logo_url,
      })),
    [brands]
  );

  if (!enabled || renderBrands.length === 0) {
    return null;
  }

  return (
    <section
      className="brands-luxury-strip"
      dir="rtl"
      aria-label="الماركات"
    >
      <style>
        {`
          .brands-luxury-strip {
            --text: #241D20;
            --muted: #8C8186;
            --line: #EEE8EB;
            --pink: #E85A91;
            --pink-soft: #FFF7FA;

            width: 100%;
            background: #FFFFFF;
            padding: 24px 0 20px;
          }

          .brands-luxury-strip .brands-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 18px;
          }

          .brands-luxury-strip .brands-title {
            margin: 0;

            color: var(--text);

            font-size: 17px;
            font-weight: 700;
            line-height: 1.4;
          }

          .brands-luxury-strip .brands-all {
            flex-shrink: 0;

            color: var(--muted);

            font-size: 11px;
            font-weight: 600;
            line-height: 1;

            text-decoration: none;
            white-space: nowrap;
          }

          .brands-luxury-strip .brands-all:active {
            color: var(--pink);
          }

          /*
           * Native horizontal scrolling.
           * No Swiper, no momentum JS and no edge bounce logic.
           */
          .brands-luxury-strip .brands-track {
            display: flex;
            gap: 6px;

            width: 100%;

            overflow-x: auto;
            overflow-y: hidden;

            padding: 2px 0 5px;

            overscroll-behavior-x: contain;
            scroll-behavior: auto;
            scroll-snap-type: x proximity;

            scrollbar-width: none;

            -webkit-overflow-scrolling: touch;
            -ms-overflow-style: none;

            touch-action: pan-x;
          }

          .brands-luxury-strip .brands-track::-webkit-scrollbar {
            display: none;
          }

          .brands-luxury-strip .brand-item {
            position: relative;

            display: flex;
            min-width: 108px;
            width: 108px;
            min-height: 94px;

            flex: 0 0 108px;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            padding: 12px 7px 14px;

            color: inherit;

            text-decoration: none;

            scroll-snap-align: start;

            -webkit-tap-highlight-color: transparent;
          }

          .brands-luxury-strip .brand-item::after {
            content: "";

            position: absolute;

            right: 22%;
            bottom: 0;
            left: 22%;

            height: 1px;

            border-radius: 999px;

            background: var(--line);
          }

          .brands-luxury-strip .brand-logo {
            display: flex;

            width: 72px;
            height: 38px;

            align-items: center;
            justify-content: center;
          }

          .brands-luxury-strip .brand-logo img {
            display: block;

            max-width: 100%;
            max-height: 30px;

            object-fit: contain;
          }

          .brands-luxury-strip .brand-fallback {
            display: block;

            max-width: 100%;

            overflow: hidden;

            color: var(--text);

            font-size: 11px;
            font-weight: 700;
            line-height: 1.35;

            text-align: center;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .brands-luxury-strip .brand-name {
            display: block;

            width: 100%;

            margin-top: 10px;

            overflow: hidden;

            color: #51484C;

            font-size: 11px;
            font-weight: 600;
            line-height: 1.35;

            text-align: center;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .brands-luxury-strip .brand-item:active .brand-name {
            color: var(--pink);
          }

          .brands-luxury-strip .brand-item:active::after {
            height: 2px;
            background: var(--pink);
          }

          @media (hover: hover) {
            .brands-luxury-strip .brands-all:hover {
              color: var(--pink);
            }

            .brands-luxury-strip .brand-item:hover .brand-name {
              color: var(--pink);
            }

            .brands-luxury-strip .brand-item:hover::after {
              height: 2px;
              background: var(--pink);
            }
          }

          @media (min-width: 640px) {
            .brands-luxury-strip {
              padding: 28px 0 24px;
            }

            .brands-luxury-strip .brands-header {
              margin-bottom: 20px;
            }

            .brands-luxury-strip .brands-title {
              font-size: 19px;
            }

            .brands-luxury-strip .brands-all {
              font-size: 12px;
            }

            .brands-luxury-strip .brands-track {
              gap: 10px;
            }

            .brands-luxury-strip .brand-item {
              min-width: 132px;
              width: 132px;
              min-height: 106px;

              flex-basis: 132px;
            }

            .brands-luxury-strip .brand-logo {
              width: 88px;
              height: 42px;
            }

            .brands-luxury-strip .brand-logo img {
              max-height: 34px;
            }

            .brands-luxury-strip .brand-name {
              font-size: 12px;
            }
          }

          @media (min-width: 1024px) {
            .brands-luxury-strip {
              padding: 30px 0 26px;
            }

            .brands-luxury-strip .brands-track {
              gap: 14px;
            }

            .brands-luxury-strip .brand-item {
              min-width: 144px;
              width: 144px;
              min-height: 112px;

              flex-basis: 144px;
            }
          }
        `}
      </style>

      <div className="container mx-auto px-4 md:px-8">

        {/* HEADER */}
        <div className="brands-header">
          <h2 className="brands-title">
            الماركات
          </h2>

          <Link
            to="/brands"
            className="brands-all"
          >
            عرض جميع الماركات
          </Link>
        </div>

        {/* BRANDS */}
        <div className="brands-track">
          {renderBrands.map((brand) => (
            <Link
              key={brand.id}
              to={`/brands/${brand.slug}`}
              className="brand-item"
              aria-label={`عرض منتجات ${brand.name}`}
            >
              <div className="brand-logo">
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="brand-fallback">
                    {brand.name}
                  </span>
                )}
              </div>

              <span className="brand-name">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsStrip;