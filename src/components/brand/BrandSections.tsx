import React from "react";

interface Section {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  category_name: string | null;
}


interface Props {
  sections: Section[];

  selectedSection: Section | null;

  onSelect: (section: Section) => void;
}


const BrandSections = ({
  sections,
  selectedSection,
  onSelect,
}: Props) => {


  if (!sections || sections.length === 0) {
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
        py-8
      "
    >

      <div
        className="
          flex
          gap-4
          overflow-x-auto
          scrollbar-hide
          pb-3
        "
      >

        {sections.map((section) => (

          <button

            key={section.id}

            onClick={() => onSelect(section)}

            className={`
              min-w-[150px]
              md:min-w-[200px]
              rounded-3xl
              overflow-hidden
              border
              transition-all
              duration-300

              ${
                selectedSection?.id === section.id
                  ? "border-pink-500 shadow-lg scale-105"
                  : "border-gray-200 hover:shadow-md"
              }

            `}

          >

            <div
              className="
                h-32
                bg-gray-100
                overflow-hidden
              "
            >

              {section.image_url ? (

                <img

                  src={section.image_url}

                  alt={section.name}

                  className="
                    w-full
                    h-full
                    object-cover
                    transition-transform
                    duration-500
                    hover:scale-110
                  "

                />

              ) : (

                <div
                  className="
                    w-full
                    h-full
                    flex
                    items-center
                    justify-center
                    text-gray-400
                  "
                >
                  {section.name}
                </div>

              )}

            </div>



            <div
              className="
                p-4
                text-center
                font-semibold
              "
            >

              {section.name}

            </div>


          </button>

        ))}


      </div>


    </section>

  );

};


export default BrandSections;