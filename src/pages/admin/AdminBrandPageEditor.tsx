import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";


interface Brand {
  id: string;
  name: string;
}


const AdminBrandPageEditor = () => {

  const navigate = useNavigate();

  const { id } = useParams();


  const [brands, setBrands] =
    useState<Brand[]>([]);


  const [brandId, setBrandId] =
    useState("");


  const [heroImage, setHeroImage] =
    useState("");


  const [title, setTitle] =
    useState("");


  const [description, setDescription] =
    useState("");


  const [loading, setLoading] =
    useState(false);



  useEffect(() => {

    loadBrands();


    if(id){

      loadPage();

    }

  }, [id]);



  const loadBrands = async () => {


    const { data } =
      await supabase
        .from("brands")
        .select("id,name")
        .eq(
          "is_active",
          true
        )
        .order("name");


    setBrands(data || []);

  };




  const loadPage = async () => {


    const { data,error } =
      await supabase
        .from("brand_pages")
        .select("*")
        .eq(
          "id",
          id
        )
        .single();



    if(error){

      console.error(error);

      return;

    }



    setBrandId(
      data.brand_id
    );

    setHeroImage(
      data.hero_image || ""
    );

    setTitle(
      data.title || ""
    );

    setDescription(
      data.description || ""
    );


  };




  const savePage = async () => {


    try {


      setLoading(true);



      const payload = {

        brand_id: brandId,

        hero_image: heroImage || null,

        title,

        description,

        is_active:true,

      };



      if(id){


        const {error} =
          await supabase
            .from("brand_pages")
            .update(payload)
            .eq(
              "id",
              id
            );


        if(error)
          throw error;



      }else{


        const {error} =
          await supabase
            .from("brand_pages")
            .insert(payload);



        if(error)
          throw error;


      }



      navigate(
        "/admin/brand-pages"
      );


    }catch(error){

      console.error(
        "Save brand page error",
        error
      );


    }finally{

      setLoading(false);

    }


  };



  return (

    <div
      dir="rtl"
      className="
        max-w-3xl
        mx-auto
        p-6
        space-y-6
      "
    >


      <h1
        className="
          text-2xl
          font-bold
        "
      >

        {id
          ? "تعديل صفحة ماركة"
          : "إضافة صفحة ماركة"
        }

      </h1>




      <div className="space-y-2">

        <label>
          الماركة
        </label>


        <select

          value={brandId}

          onChange={(e)=>
            setBrandId(
              e.target.value
            )
          }

          className="
            w-full
            border
            rounded-xl
            p-3
          "

        >

          <option value="">
            اختر الماركة
          </option>


          {brands.map(brand=>(

            <option

              key={brand.id}

              value={brand.id}

            >

              {brand.name}

            </option>

          ))}


        </select>


      </div>




      <div className="space-y-2">

        <label>
          صورة البانر الرئيسي
        </label>


        <Input

          value={heroImage}

          onChange={(e)=>
            setHeroImage(
              e.target.value
            )
          }

          placeholder="رابط الصورة"

        />


      </div>




      <div className="space-y-2">

        <label>
          العنوان
        </label>


        <Input

          value={title}

          onChange={(e)=>
            setTitle(
              e.target.value
            )
          }

          placeholder="مثلاً Nike Collection"

        />

      </div>




      <div className="space-y-2">

        <label>
          الوصف
        </label>


        <Textarea

          value={description}

          onChange={(e)=>
            setDescription(
              e.target.value
            )
          }

          placeholder="وصف صفحة الماركة"

          rows={5}

        />


      </div>




      <Button

        disabled={loading}

        onClick={savePage}

        className="
          w-full
        "

      >

        {loading
          ? "جاري الحفظ..."
          : "حفظ الصفحة"
        }


      </Button>



    </div>

  );

};


export default AdminBrandPageEditor;