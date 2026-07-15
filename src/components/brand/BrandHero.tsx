import React from "react";

interface Props {
  brand: {
    id: string;
    name: string;
    logo_url: string | null;
  };

  page: {
    hero_image: string | null;
    title: string | null;
    description: string | null;
  } | null;
}


const BrandHero = ({
  brand,
  page,
}: Props) => {

  return (
    <section
      className="
        relative
        w-full
        overflow-hidden
        bg-neutral-100
      "
    >

      {page?.hero_image && (

        <img
          src={page.hero_image}
          alt={brand.name}
          className="
            w-full
            h-[420px]
            md:h-[600px]
            object-cover
          "
        />

      )}



      <div
        className="
          absolute
          inset-0
          bg-black/30
          flex
          items-center
          justify-center
          text-center
          px-6
        "
      >

        <div
          className="
            text-white
            max-w-3xl
          "
        >


          <h1
            className="
              text-4xl
              md:text-6xl
              font-bold
              mb-4
            "
          >
            {page?.title || brand.name}
          </h1>



          {page?.description && (

            <p
              className="
                text-lg
                md:text-xl
                opacity-90
              "
            >
              {page.description}
            </p>

          )}



        </div>

      </div>



    </section>
  );
};


export default BrandHero;