import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


interface Section {

  id: string;

  name: string;

  slug: string;

  image_url: string | null;

  category_name: string | null;

}



const AdminBrandSectionsPage = () => {


  const { id } = useParams();


  const [sections, setSections] =
    useState<Section[]>([]);


  const [name, setName] =
    useState("");


  const [slug, setSlug] =
    useState("");


  const [image, setImage] =
    useState("");


  const [categoryName, setCategoryName] =
    useState("");



  const [loading, setLoading] =
    useState(false);



  useEffect(() => {

    if(id){

      loadSections();

    }

  }, [id]);




  const loadSections = async () => {


    const { data,error } =
      await supabase
        .from("brand_sections")
        .select("*")
        .eq(
          "brand_page_id",
          id
        )
        .order(
          "sort_order"
        );



    if(error){

      console.error(error);

      return;

    }



    setSections(
      data || []
    );


  };





  const addSection = async () => {


    if(!id || !name)
      return;



    try {


      setLoading(true);



      const { error } =
        await supabase
          .from("brand_sections")
          .insert({

            brand_page_id:id,

            name,

            slug:
              slug ||
              name
              .toLowerCase()
              .replaceAll(
                " ",
                "-"
              ),

            image_url:
              image || null,


            category_name:
              categoryName || null,


            is_active:true,


            sort_order:
              sections.length

          });



      if(error)
        throw error;



      setName("");

      setSlug("");

      setImage("");

      setCategoryName("");



      loadSections();



    }catch(error){

      console.error(
        "Add section error",
        error
      );


    }finally{

      setLoading(false);

    }


  };





  const deleteSection = async (
    sectionId:string
  ) => {


    await supabase
      .from("brand_sections")
      .delete()
      .eq(
        "id",
        sectionId
      );


    loadSections();


  };




  return (

    <div
      dir="rtl"
      className="
        p-6
        space-y-8
      "
    >


      <h1
        className="
          text-2xl
          font-bold
        "
      >
        أقسام الماركة
      </h1>




      <div
        className="
          grid
          md:grid-cols-2
          gap-4
        "
      >


        <Input

          placeholder="اسم القسم"

          value={name}

          onChange={(e)=>
            setName(
              e.target.value
            )
          }

        />



        <Input

          placeholder="Slug"

          value={slug}

          onChange={(e)=>
            setSlug(
              e.target.value
            )
          }

        />



        <Input

          placeholder="رابط الصورة"

          value={image}

          onChange={(e)=>
            setImage(
              e.target.value
            )
          }

        />



        <Input

          placeholder="اسم تصنيف المنتجات"

          value={categoryName}

          onChange={(e)=>
            setCategoryName(
              e.target.value
            )
          }

        />


      </div>



      <Button

        disabled={loading}

        onClick={addSection}

      >

        إضافة قسم

      </Button>





      <div
        className="
          grid
          md:grid-cols-3
          gap-5
        "
      >


        {sections.map(section=>(


          <div

            key={section.id}

            className="
              border
              rounded-2xl
              p-4
              space-y-3
            "

          >


            {section.image_url && (

              <img

                src={section.image_url}

                className="
                  w-full
                  h-40
                  object-cover
                  rounded-xl
                "

              />

            )}



            <h3
              className="
                font-bold
              "
            >

              {section.name}

            </h3>



            <p
              className="
                text-sm
                text-gray-500
              "
            >

              المنتجات:
              {" "}
              {section.category_name || "غير محدد"}

            </p>




            <Button

              variant="destructive"

              onClick={() =>
                deleteSection(
                  section.id
                )
              }

            >

              حذف

            </Button>



          </div>


        ))}


      </div>


    </div>

  );

};


export default AdminBrandSectionsPage;