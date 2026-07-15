import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import BrandHero from "@/components/brand/BrandHero";
import BrandBanner from "@/components/brand/BrandBanner";
import BrandSections from "@/components/brand/BrandSections";
import BrandFilterTabs from "@/components/brand/BrandFilterTabs";
import BrandProducts from "@/components/brand/BrandProducts";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

interface BrandPageData {
  id: string;
  hero_image: string | null;
  title: string | null;
  description: string | null;
}

interface BrandBannerData {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link: string | null;
}

interface BrandSection {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  category_name: string | null;
}


interface BrandFilter {
  id: string;
  name: string;
  slug: string;
}


const BrandPage = () => {

  const { slug } = useParams();

  const [loading, setLoading] = useState(true);

  const [brand, setBrand] = useState<Brand | null>(null);

  const [page, setPage] = useState<BrandPageData | null>(null);

  const [banners, setBanners] = useState<BrandBannerData[]>([]);

  const [sections, setSections] = useState<BrandSection[]>([]);

  const [selectedSection, setSelectedSection] =
    useState<BrandSection | null>(null);


  const [selectedFilter, setSelectedFilter] =
    useState<BrandFilter | null>(null);



  useEffect(() => {

    if (!slug) return;

    loadBrand();

  }, [slug]);



  const loadBrand = async () => {

    try {

      setLoading(true);


      const { data: brandData, error: brandError } =
        await supabase
          .from("brands")
          .select("*")
          .eq("name", slug)
          .eq("is_active", true)
          .single();



      if (brandError) throw brandError;


      setBrand(brandData);



      const { data: pageData } =
        await supabase
          .from("brand_pages")
          .select("*")
          .eq("brand_id", brandData.id)
          .eq("is_active", true)
          .single();



      if (pageData) {

        setPage(pageData);



        const { data: bannerData } =
          await supabase
            .from("brand_banners")
            .select("*")
            .eq("brand_page_id", pageData.id)
            .eq("is_active", true)
            .order("sort_order");


        setBanners(bannerData || []);




        const { data: sectionData } =
          await supabase
            .from("brand_sections")
            .select("*")
            .eq("brand_page_id", pageData.id)
            .eq("is_active", true)
            .order("sort_order");


        setSections(sectionData || []);

      }


    } catch(error){

      console.error(
        "Brand page error:",
        error
      );

    } finally {

      setLoading(false);

    }

  };



  const handleSectionChange = (section: BrandSection) => {

    setSelectedSection(section);

    // إعادة الفلتر عند تغيير القسم
    setSelectedFilter(null);

  };



  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        جاري التحميل...
      </div>
    );

  }



  if (!brand) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        الماركة غير موجودة
      </div>
    );

  }



  return (

    <main
      dir="rtl"
      className="min-h-screen bg-white"
    >


      <BrandHero
        brand={brand}
        page={page}
      />



      <BrandBanner
        banners={banners}
      />



      <BrandSections

        sections={sections}

        selectedSection={selectedSection}

        onSelect={handleSectionChange}

      />




      {selectedSection && (

        <BrandFilterTabs

          sectionId={selectedSection.id}

          selectedFilter={selectedFilter?.id || null}

          onSelect={setSelectedFilter}

        />

      )}




      <BrandProducts

        brand={brand.name}

        section={selectedSection}

        filter={selectedFilter}

      />



    </main>

  );

};


export default BrandPage;