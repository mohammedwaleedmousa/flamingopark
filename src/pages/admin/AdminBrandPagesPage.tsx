import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Upload,
  Image as ImageIcon,
  Save,
  Loader2,
} from "lucide-react";

import { toast } from "@/hooks/use-toast";


interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}



const AdminBrandPageEditor = () => {


  const navigate = useNavigate();

  const { id } = useParams();

  const [searchParams] = useSearchParams();


  const [brands,setBrands] =
    useState<Brand[]>([]);


  const [brandId,setBrandId] =
    useState("");



  const [heroImage,setHeroImage] =
    useState("");



  const [title,setTitle] =
    useState("");



  const [description,setDescription] =
    useState("");



  const [loading,setLoading] =
    useState(false);



  const [uploading,setUploading] =
    useState(false);




  useEffect(()=>{


    loadBrands();


    const brandFromUrl =
      searchParams.get("brand");


    if(brandFromUrl){

      setBrandId(
        brandFromUrl
      );

    }


    if(id){

      loadPage();

    }


  },[id]);






  const loadBrands = async()=>{


    const {
      data,
      error
    } = await supabase
      .from("brands")
      .select(`
        id,
        name,
        logo_url
      `)
      .eq(
        "is_active",
        true
      )
      .order(
        "name"
      );


    if(error){

      console.error(error);

      return;

    }


    setBrands(
      data || []
    );

  };







  const loadPage = async()=>{


    const {
      data,
      error
    } = await supabase
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








  const uploadImage = async(
    file:File
  )=>{


    try{


      setUploading(true);



      const fileExt =
        file.name.split(".").pop();



      const fileName =
        `brand-pages/${crypto.randomUUID()}.${fileExt}`;





      const {
        error
      } = await supabase
        .storage
        .from("uploads")
        .upload(
          fileName,
          file,
          {
            cacheControl:"3600",
            upsert:false
          }
        );



      if(error)
        throw error;





      const {
        data
      } =
      supabase
      .storage
      .from("uploads")
      .getPublicUrl(
        fileName
      );



      setHeroImage(
        data.publicUrl
      );



      toast({
        title:"تم رفع الصورة"
      });



    }catch(error){

      console.error(error);


      toast({
        title:"فشل رفع الصورة",
        variant:"destructive"
      });



    }finally{

      setUploading(false);

    }

  };








  const savePage = async()=>{


    if(!brandId){


      toast({

        title:"اختر الماركة أولاً",

        variant:"destructive"

      });


      return;

    }





    try{


      setLoading(true);



      const payload = {


        brand_id:brandId,


        hero_image:
          heroImage || null,


        title,


        description,


        is_active:true,


      };





      let error;



      if(id){


        ({
          error
        } =
        await supabase
          .from("brand_pages")
          .update(payload)
          .eq(
            "id",
            id
          ));



      }else{



        ({
          error
        } =
        await supabase
          .from("brand_pages")
          .insert(payload));



       }




      if(error)
        throw error;




      toast({

        title:"تم حفظ صفحة الماركة بنجاح"

      });



      navigate(
        "/admin/brand-pages"
      );



    }catch(error){


      console.error(
        "Save error",
        error
      );


      toast({

        title:"حدث خطأ أثناء الحفظ",

        variant:"destructive"

      });



    }finally{

      setLoading(false);

    }

  };







  return (


    <div
      dir="rtl"
      className="
      max-w-4xl
      mx-auto
      p-6
      space-y-8
      "
    >



      <div>

        <h1
          className="
          text-3xl
          font-bold
          "
        >

          {id
          ? "تعديل صفحة الماركة"
          : "إنشاء صفحة ماركة"}

        </h1>


        <p
          className="
          text-muted-foreground
          mt-2
          "
        >

          إنشاء تجربة متجر خاصة بالماركة

        </p>


      </div>







      <div
        className="
        bg-white
        rounded-3xl
        border
        shadow-sm
        p-6
        space-y-6
        "
      >





        <div className="space-y-2">

          <label>
            اختر الماركة
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
            rounded-xl
            border
            p-3
            "

          >

            <option value="">
              اختر الماركة
            </option>


            {brands.map((brand)=>(

              <option
                key={brand.id}
                value={brand.id}
              >

                {brand.name}

              </option>

            ))}


          </select>


        </div>







        <div className="space-y-3">


          <label>
            صورة البانر الرئيسي
          </label>



          <div
            className="
            border-2
            border-dashed
            rounded-2xl
            p-6
            text-center
            "
          >


            <input

              type="file"

              accept="image/*"

              onChange={(e)=>{

                const file =
                e.target.files?.[0];


                if(file)
                  uploadImage(file);

              }}

              className="hidden"

              id="hero-upload"

            />



            <label
              htmlFor="hero-upload"
              className="
              cursor-pointer
              flex
              flex-col
              items-center
              gap-3
              "
            >


              {uploading ?

              <Loader2
                className="animate-spin"
              />

              :

              <Upload/>

              }


              اضغط لرفع الصورة


            </label>



          </div>




          {heroImage && (

            <img

              src={heroImage}

              className="
              w-full
              h-56
              object-cover
              rounded-2xl
              "
            />

          )}



        </div>






        <Input

          value={title}

          onChange={(e)=>
            setTitle(e.target.value)
          }

          placeholder="عنوان الصفحة"

        />






        <Textarea

          value={description}

          onChange={(e)=>
            setDescription(
              e.target.value
            )
          }

          placeholder="وصف الصفحة"

          rows={5}

        />






        <Button

          onClick={savePage}

          disabled={
            loading ||
            uploading
          }

          className="
          w-full
          rounded-xl
          gap-2
          "
        >

          {loading ?

          <Loader2
            className="animate-spin"
          />

          :

          <Save/>

          }


          حفظ الصفحة


        </Button>



      </div>



    </div>


  );

};


export default AdminBrandPageEditor;