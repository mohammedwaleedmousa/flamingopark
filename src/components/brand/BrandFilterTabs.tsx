import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";


interface Filter {

  id: string;

  name: string;

  slug: string;

}



interface Props {

  sectionId: string;

  selectedFilter?: string | null;

  onSelect?: (filter: Filter | null) => void;

}



const BrandFilterTabs = ({
  sectionId,
  selectedFilter,
  onSelect,
}: Props) => {


  const [filters, setFilters] = useState<Filter[]>([]);



  useEffect(() => {

    if (!sectionId) return;

    loadFilters();

  }, [sectionId]);



  const loadFilters = async () => {


    const { data, error } =
      await supabase
        .from("brand_filters")
        .select("*")
        .eq("section_id", sectionId)
        .eq("is_active", true)
        .order("sort_order");


    if (error) {

      console.error(
        "Filters error:",
        error
      );

      return;

    }


    setFilters(data || []);

  };



  if (filters.length === 0) {

    return null;

  }



  return (

    <section
      dir="rtl"
      className="
        max-w-[1400px]
        mx-auto
        px-4
        md:px-8
        py-4
      "
    >

      <div
        className="
          flex
          gap-3
          overflow-x-auto
        "
      >


        <button

          onClick={() => onSelect?.(null)}

          className={`
            px-6
            py-2
            rounded-full
            border
            text-sm
            transition

            ${
              !selectedFilter
              ? "bg-pink-500 text-white border-pink-500"
              : "bg-white hover:bg-gray-50"
            }

          `}

        >
          الكل
        </button>



        {filters.map((filter) => (

          <button

            key={filter.id}

            onClick={() => onSelect?.(filter)}

            className={`
              px-6
              py-2
              rounded-full
              border
              text-sm
              whitespace-nowrap
              transition

              ${
                selectedFilter === filter.id
                ? "bg-pink-500 text-white border-pink-500"
                : "bg-white hover:bg-gray-50"
              }

            `}

          >

            {filter.name}

          </button>


        ))}



      </div>


    </section>

  );

};


export default BrandFilterTabs;