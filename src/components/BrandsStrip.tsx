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
    <section className="brands-luxury" dir="rtl" aria-label="الماركات">
      <style>
      {`
      .brands-luxury{
        --text:#1F1F1F;
        --muted:#777;
        --border:#ECECEC;
        --accent:#E8547C;
        --accent-soft:#FFF6F9;
        background:#fff;
        padding:18px 0 16px;
        border-top:1px solid var(--border);
      }
      .brands-luxury .header{
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:22px;
      }
      .brands-luxury .title{
        font-family:"Noto Kufi Arabic",sans-serif;
        font-size:17px;
        font-weight:700;
        color:var(--text);
        margin:0;
        letter-spacing:-0.2px;
      }
      .brands-luxury .view-all{
        display:inline-flex;
        align-items:center;
        gap:6px;
        color:var(--muted);
        text-decoration:none;
        font-size:13px;
        font-weight:600;
        transition:all .25s ease;
      }
      .brands-luxury .view-all svg{
        width:14px;
        height:14px;
        transition:transform .25s ease;
      }
      .brands-luxury .view-all:hover{
        color:var(--accent);
      }
      .brands-luxury .view-all:hover svg{
        transform:translateX(-3px);
      }
      .brands-luxury .swiper{
        overflow:hidden;
        padding:6px 0;
        touch-action:pan-y;
      }
      .brands-luxury .swiper-wrapper{
        touch-action:pan-y;
      }
      .brands-luxury .swiper-slide{
        width:94px;
      }
      .brands-luxury .brand{
        display:flex;
        flex-direction:column;
        align-items:center;
        text-decoration:none;
      }
      .brands-luxury .logo-box{
        width:82px;
        height:82px;
        background:#fff;
        border:1px solid var(--border);
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
        transition:
          border-color .28s ease,
          background .28s ease,
          box-shadow .28s ease,
          transform .28s ease;
      }
      .brands-luxury .logo-box img{
        max-width:56%;
        max-height:56%;
        object-fit:contain;
        transition:transform .28s ease;
        filter:grayscale(.08);
      }
      .brands-luxury .name{
        margin-top:11px;
        font-size:12px;
        font-weight:500;
        color:var(--text);
        text-align:center;
        line-height:1.35;
        transition:color .28s ease;
      }
      /* Hover */
      .brands-luxury .brand:hover .logo-box{
        border-color:#E8547C;
      }
      .brands-luxury .brand:hover .logo-box img{
        transform:scale(1.08);
        filter:none;
      }
      .brands-luxury .brand:hover .name{
        color:var(--accent);
      }
      .brands-luxury .brand:active .logo-box{
        transform:scale(.97);
      }
    `}
    </style>
      <div className="container mx-auto px-4">
        <div className="header">
          <h2 className="title">الماركات</h2>
          <Link to="/brands" className="view-all">
            عرض جميع الماركات
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </Link>
        </div>
        <Swiper
          modules={[FreeMode]}
          slidesPerView="auto"
          spaceBetween={22}
          freeMode={{ enabled:true, momentum:true }}
          touchStartPreventDefault={false}
          touchReleaseOnEdges
          resistanceRatio={0}
          threshold={4}
          grabCursor
        >
          {renderBrands.map((brand)=>(
            <SwiperSlide key={brand.id}>
              <Link
                to={`/brands/${brand.slug}`}
                className="brand"
              >
                <div className="logo-box">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[11px] text-center px-2">
                      {brand.name}
                    </span>
                  )}
                </div>
                <span className="name line-clamp-1">
                  {brand.name}
                </span>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default BrandsStrip;