import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

import ProductCard from "@/components/ProductCard";


interface Section {

  id: string;

  name: string;

  slug: string;

  image_url: string | null;

  category_name: string | null;

}



interface Filter {

  id: string;

  name: string;

  slug: string;

}



interface Product {

  id: string;

  name: string;

  name_ar: string | null;

  slug: string;

  price: number;

  original_price: number | null;

  discount: number | null;

  images: string[];

  brand: string;

  category: string;

}



interface Props {

  brand: string;

  section: Section | null;

  filter: Filter | null;

}



const BrandProducts = ({
  brand,
  section,
  filter,
}: Props) => {


  const [products, setProducts] =
    useState<Product[]>([]);


  const [loading, setLoading] =
    useState(false);



  useEffect(() => {

    loadProducts();

  }, [
    brand,
    section,
    filter
  ]);



  const loadProducts = async () => {


    try {

      setLoading(true);



      let query =
        supabase
          .from("products")
          .select("*")
          .eq("brand", brand)
          .eq("is_active", true);



      // فلترة القسم
      if(section?.category_name){

        query =
          query.eq(
            "category",
            section.category_name
          );

      }



      const { data, error } =
        await query
          .order(
            "sort_order",
            {
              ascending: true
            }
          );



      if(error){

        throw error;

      }



      let result =
        data || [];



      /*
        فلترة إضافية حسب
        product_brand_filters
      */

      if(filter && result.length){


        const { data: filterProducts } =
          await supabase
            .from("product_brand_filters")
            .select("product_id")
            .eq(
              "filter_id",
              filter.id
            );



        const ids =
          filterProducts?.map(
            item => item.product_id
          ) || [];



        result =
          result.filter(
            product =>
              ids.includes(product.id)
          );

      }



      setProducts(result);



    } catch(error){

      console.error(
        "Brand products error:",
        error
      );


    } finally {

      setLoading(false);

    }


  };



  if(loading){

    return (

      <div
        className="
          py-20
          text-center
        "
      >

        جاري تحميل المنتجات...

      </div>

    );

  }



  if(products.length === 0){

    return (

      <div
        className="
          py-20
          text-center
          text-gray-500
        "
      >

        لا توجد منتجات حالياً

      </div>

    );

  }



  return (

    <section
      dir="rtl"
      className="
        max-w-[1400px]
        mx-auto
        px-4
        md:px-8
        py-10
      "
    >


      <div
        className="
          grid
          grid-cols-2
          md:grid-cols-3
          lg:grid-cols-4
          gap-5
        "
      >

        {products.map(product => (

          <ProductCard

            key={product.id}

            product={product}

          />

        ))}


      </div>


    </section>

  );

};


export default BrandProducts;