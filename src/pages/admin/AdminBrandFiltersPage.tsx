import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


interface Filter {

  id: string;

  name: string;

  slug: string;

}



const AdminBrandFiltersPage = () => {


  const { id } = useParams();


  const [filters, setFilters] =
    useState<Filter[]>([]);


  const [name, setName] =
    useState("");


  const [slug, setSlug] =
    useState("");


  const [loading, setLoading] =
    useState(false);




  useEffect(() => {

    if(id){

      loadFilters();

    }

  }, [id]);





  const loadFilters = async () => {


    const { data,error } =
      await supabase
        .from("brand_filters")
        .select("*")
        .eq(
          "section_id",
          id
        )
        .order(
          "sort_order"
        );



    if(error){

      console.error(error);

      return;

    }


    setFilters(
      data || []
    );


  };





  const addFilter = async () => {


    if(!id || !name)
      return;



    try {


      setLoading(true);



      const { error } =
        await supabase
          .from("brand_filters")
          .insert({

            section_id:id,

            name,

            slug:
              slug ||
              name
              .toLowerCase()
              .replaceAll(
                " ",
                "-"
              ),


            is_active:true,


            sort_order:
              filters.length

          });



      if(error)
        throw error;



      setName("");

      setSlug("");


      loadFilters();



    }catch(error){


      console.error(
        "Add filter error",
        error
      );


    }finally{

      setLoading(false);

    }


  };





  const deleteFilter = async (
    filterId:string
  ) => {


    await supabase
      .from("brand_filters")
      .delete()
      .eq(
        "id",
        filterId
      );


    loadFilters();


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

        فلاتر القسم

      </h1>




      <div
        className="
          flex
          gap-3
          flex-col
          md:flex-row
        "
      >


        <Input

          placeholder="اسم الفلتر"

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



        <Button

          disabled={loading}

          onClick={addFilter}

        >

          إضافة

        </Button>



      </div>





      <div
        className="
          flex
          flex-wrap
          gap-4
        "
      >


        {filters.map(filter => (


          <div

            key={filter.id}

            className="
              border
              rounded-full
              px-5
              py-3
              flex
              items-center
              gap-3
            "

          >

            <span>
              {filter.name}
            </span>



            <button

              onClick={() =>
                deleteFilter(
                  filter.id
                )
              }

              className="
                text-red-500
                text-sm
              "

            >

              حذف

            </button>



          </div>


        ))}



      </div>



    </div>

  );

};


export default AdminBrandFiltersPage;