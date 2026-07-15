import React from "react";

interface Banner {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link: string | null;
}


interface Props {
  banners: Banner[];
}


const BrandBanner = ({
  banners,
}: Props) => {


  if (!banners || banners.length === 0) {
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
        py-10
      "
    >

      <div
        className="
          grid
          gap-6
          md:grid-cols-2
        "
      >

        {banners.map((banner) => (

          <div
            key={banner.id}
            className="
              relative
              overflow-hidden
              rounded-3xl
              group
              shadow-sm
              bg-gray-100
            "
          >

            <img
              src={banner.image_url}
              alt={banner.title || "banner"}
              className="
                w-full
                h-[220px]
                md:h-[320px]
                object-cover
                transition-transform
                duration-500
                group-hover:scale-105
              "
            />


            <div
              className="
                absolute
                inset-0
                bg-gradient-to-t
                from-black/70
                via-black/20
                to-transparent
              "
            />


            <div
              className="
                absolute
                bottom-0
                right-0
                p-6
                text-white
              "
            >

              {banner.title && (

                <h3
                  className="
                    text-2xl
                    font-bold
                    mb-2
                  "
                >
                  {banner.title}
                </h3>

              )}



              {banner.subtitle && (

                <p
                  className="
                    text-sm
                    opacity-90
                  "
                >
                  {banner.subtitle}
                </p>

              )}



            </div>


          </div>

        ))}

      </div>


    </section>

  );

};


export default BrandBanner;