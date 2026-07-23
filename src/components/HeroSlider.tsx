import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=70",
    title: "تسوق أحدث صيحات الموضة",
    desc: "اكتشف مجموعات مختارة من أفضل الماركات العالمية",
  },
  {
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=70",
    title: "أناقة تعكس شخصيتك",
    desc: "منتجات فاخرة بتصميم عصري وجودة عالية",
  },
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70",
    title: "تجربة تسوق مختلفة",
    desc: "كل ما تحتاجه في مكان واحد",
  },
];

export default function HeroSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef<any>(null);

  return (
    <section
      dir="rtl"
      className="relative h-[50svh] min-h-[400px] overflow-hidden"
    >
      <Swiper
        modules={[Autoplay]}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={(swiper) => {
          setActiveIndex(swiper.realIndex);
        }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
          waitForTransition: true,
        }}
        speed={800}
        loop={true}
        loopPreventsSliding={true}
        grabCursor={true}
        touchRatio={1}
        resistance={true}
        resistanceRatio={0.85}
        className="hero-slider h-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div
              className="relative h-full w-full bg-cover bg-center will-change-transform"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-l from-black/75 via-black/40 to-transparent" />
              <div className="absolute inset-0">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 px-6 pt-32 sm:px-10 md:px-20 max-w-lg text-right text-white">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
                    {slide.title}
                  </h1>
                  <p className="mt-5 text-sm sm:text-base text-white/80 leading-7 max-w-sm">
                    {slide.desc}
                  </p>
                  <Link
                    to="/products"
                    className="inline-flex mt-8 text-sm border-b border-white pb-2 hover:opacity-70 transition"
                  >
                    اكتشف المجموعة
                  </Link>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
        <div className=" absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
        <button
          key={index}
          onClick={() => {
            swiperRef.current?.slideToLoop(index);
          }}
          className={`
            h-[3px]
            rounded-full
            transition-all
            duration-300
            ${
              activeIndex === index
                ? "w-[45px] bg-white"
                : "w-[18px] bg-white/40"
            }
          `}
        />
        ))}
        </div>
    </section>
  );
}
