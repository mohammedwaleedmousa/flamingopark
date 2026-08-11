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
        slug: brand.slug || brand.name.toLowerCase().replace(/\s+/g, "-"),
        logo_url: brand.logo_url,
      })),
    [brands]
  );

  if (!enabled || renderBrands.length === 0) {
    return null;
  }

  return (
    <section className="brands-clean-strip" dir="rtl" aria-label="الماركات">
      <style>{`
        .brands-clean-strip {
          --pink: #E85A91;
          --text: #241D20;
          --muted: #8F8589;
          --line: #EEE9EB;

          width: 100%;
          background: #FFFFFF;
          padding: 20px 0 24px;
        }

        /* =========================
           HEADER
        ========================= */

        .brands-clean-strip .brands-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .brands-clean-strip .brands-heading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .brands-clean-strip .brands-marker {
          width: 4px;
          height: 28px;
          border-radius: 999px;
          background: var(--pink);
        }

        .brands-clean-strip .brands-title {
          margin: 0;
          color: var(--text);
          font-size: 20px;
          font-weight: 800;
          line-height: 1.4;
        }

        .brands-clean-strip .brands-all {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          color: var(--muted);

          font-size: 12px;
          font-weight: 600;

          text-decoration: none;
          white-space: nowrap;

          transition: color 160ms ease;
        }

        .brands-clean-strip .brands-all-icon {
          color: var(--pink);
          font-size: 17px;
          line-height: 1;
          transform: translateY(-1px);
        }

        /* =========================
           MAIN STRIP
        ========================= */

        .brands-clean-strip .brands-shell {
          position: relative;

          width: 100%;

          overflow: hidden;

          border: 1px solid #F0EBED;
          border-radius: 22px;

          background: #FFFFFF;

          box-shadow:
            0 8px 28px rgba(44, 28, 34, 0.045),
            0 2px 7px rgba(44, 28, 34, 0.025);
        }

        .brands-clean-strip .brands-track {
          display: flex;

          width: 100%;

          overflow-x: auto;
          overflow-y: hidden;

          scroll-snap-type: x proximity;
          overscroll-behavior-x: contain;

          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;

          touch-action: pan-x;
        }

        .brands-clean-strip .brands-track::-webkit-scrollbar {
          display: none;
        }

        /* =========================
           BRAND ITEM
        ========================= */

        .brands-clean-strip .brand-item {
          position: relative;

          display: flex;
          flex: 0 0 108px;
          min-width: 108px;
          height: 110px;

          flex-direction: column;
          align-items: center;
          justify-content: center;

          padding: 15px 9px 13px;

          color: inherit;
          text-decoration: none;

          scroll-snap-align: start;

          -webkit-tap-highlight-color: transparent;

          transition:
            background-color 160ms ease,
            transform 160ms ease;
        }

        .brands-clean-strip .brand-item:not(:last-child)::after {
          content: "";

          position: absolute;

          top: 20px;
          bottom: 20px;
          left: 0;

          width: 1px;

          background: var(--line);
        }

        .brands-clean-strip .brand-logo {
          display: flex;

          width: 72px;
          height: 45px;

          align-items: center;
          justify-content: center;

          margin-bottom: 10px;
        }

        .brands-clean-strip .brand-logo img {
          display: block;

          max-width: 68px;
          max-height: 36px;

          object-fit: contain;

          filter: saturate(0.92);
        }

        .brands-clean-strip .brand-fallback {
          display: block;

          max-width: 100%;

          overflow: hidden;

          color: var(--text);

          font-size: 11px;
          font-weight: 800;

          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .brands-clean-strip .brand-name {
          display: block;

          width: 100%;

          overflow: hidden;

          color: #393034;

          font-size: 12px;
          font-weight: 600;
          line-height: 1.25;

          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;

          transition: color 160ms ease;
        }

        /* =========================
           INTERACTION
        ========================= */

        .brands-clean-strip .brand-item:active {
          background: #FFF8FA;
        }

        .brands-clean-strip .brand-item:active .brand-name {
          color: var(--pink);
        }

        .brands-clean-strip .brands-all:active {
          color: var(--pink);
        }

        @media (hover: hover) {
          .brands-clean-strip .brands-all:hover {
            color: var(--pink);
          }

          .brands-clean-strip .brand-item:hover {
            background: #FFF9FB;
          }

          .brands-clean-strip .brand-item:hover .brand-name {
            color: var(--pink);
          }
        }

        /* =========================
           MOBILE
        ========================= */

        @media (max-width: 639px) {
          .brands-clean-strip {
            padding: 18px 0 22px;
          }

          .brands-clean-strip .brands-header {
            margin-bottom: 13px;
          }

          .brands-clean-strip .brands-title {
            font-size: 19px;
          }

          .brands-clean-strip .brands-all {
            font-size: 11px;
          }

          .brands-clean-strip .brands-shell {
            border-radius: 20px;
          }

          .brands-clean-strip .brand-item {
            flex-basis: 102px;
            min-width: 102px;
            height: 105px;
            padding-inline: 7px;
          }

          .brands-clean-strip .brand-logo {
            width: 68px;
            height: 43px;
          }

          .brands-clean-strip .brand-logo img {
            max-width: 64px;
            max-height: 34px;
          }

          .brands-clean-strip .brand-name {
            font-size: 11.5px;
          }
        }

        /* =========================
           TABLET
        ========================= */

        @media (min-width: 640px) {
          .brands-clean-strip {
            padding: 26px 0 28px;
          }

          .brands-clean-strip .brands-title {
            font-size: 21px;
          }

          .brands-clean-strip .brands-all {
            font-size: 12px;
          }

          .brands-clean-strip .brands-shell {
            border-radius: 24px;
          }

          .brands-clean-strip .brand-item {
            flex-basis: 132px;
            min-width: 132px;
            height: 120px;
          }

          .brands-clean-strip .brand-logo {
            width: 84px;
            height: 48px;
          }

          .brands-clean-strip .brand-logo img {
            max-width: 80px;
            max-height: 38px;
          }

          .brands-clean-strip .brand-name {
            font-size: 12.5px;
          }
        }

        /* =========================
           DESKTOP
        ========================= */

        @media (min-width: 1024px) {
          .brands-clean-strip .brands-shell {
            max-width: 100%;
          }

          .brands-clean-strip .brand-item {
            flex: 1 0 145px;
            min-width: 145px;
            height: 124px;
          }

          .brands-clean-strip .brand-logo {
            width: 92px;
          }
        }
      `}</style>

      <div className="container mx-auto px-4 md:px-8">
        <div className="brands-header">
          <div className="brands-heading">
            <span className="brands-marker" />
            <h2 className="brands-title">الماركات</h2>
          </div>

          <Link to="/brands" className="brands-all">
            <span>عرض جميع الماركات</span>
            <span className="brands-all-icon">‹</span>
          </Link>
        </div>

        <div className="brands-shell">
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
                    <span className="brand-fallback">{brand.name}</span>
                  )}
                </div>

                <span className="brand-name">{brand.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandsStrip;