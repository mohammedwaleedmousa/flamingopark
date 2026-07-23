import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";


const slides = [
  {
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=70",

    title:
      "تسوق أحدث صيحات الموضة",

    desc:
      "اكتشف مجموعات مختارة من أفضل الماركات العالمية",
  },


  {
    image:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=70",

    title:
      "أناقة تعكس شخصيتك",

    desc:
      "منتجات فاخرة بتصميم عصري وجودة عالية",
  },


  {
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70",

    title:
      "تجربة تسوق مختلفة",

    desc:
      "كل ما تحتاجه في مكان واحد",
  },

];



export default function HeroSlider() {



useEffect(()=>{


const style=document.createElement("style");


style.innerHTML=`

.hero-slider .swiper-pagination{

bottom:22px !important;

display:flex;
justify-content:center;
align-items:center;

gap:8px;

}


.hero-slider .swiper-pagination-bullet{

width:32px;
height:3px;

border-radius:20px;

background:#fff;

opacity:.45;

margin:0!important;

transition:all .35s ease;

}


.hero-slider .swiper-pagination-bullet-active{

width:75px;

opacity:1;

}


@media (max-width:640px){

.hero-slider .swiper-pagination{

bottom:18px !important;

display:flex;
justify-content:center;
align-items:center;

gap:6px;

}

.hero-slider .swiper-pagination-bullet{

width:40px;
height:3px;

transform:scaleX(.5);

transition:transform .35s ease, opacity .35s ease;

}

.hero-slider .swiper-pagination-bullet-active{

transform:scaleX(1);

}

}

}


`;


document.head.appendChild(style);



return()=>{

document.head.removeChild(style);

}


},[]);





return (


<section

dir="rtl"

className="
relative
h-[50svh]
min-h-[400px]
overflow-hidden
"


>



<Swiper


modules={[
Pagination,
Autoplay
]}


pagination={{

clickable:true

}}



autoplay={{

delay:5000,

disableOnInteraction:false,

pauseOnMouseEnter:true,

}}



speed={800}



loop={true}



grabCursor={true}



touchRatio={1}



resistance={true}



resistanceRatio={0.85}



className="
hero-slider
h-full
"



>



{

slides.map((slide,index)=>(


<SwiperSlide

key={index}

>


<div


className="
relative
h-full
w-full
bg-cover
bg-center
will-change-transform
"



style={{

backgroundImage:
`url(${slide.image})`

}}


>


{/* Dark Layer */}

<div

className="
absolute
inset-0
bg-gradient-to-l
from-black/75
via-black/40
to-transparent
"

/>




{/* Content */}


<div

className="
absolute
inset-0
"

>


<div

className="
absolute
right-0
top-1/2
-translate-y-1/2
px-6
pt-32
sm:px-10
md:px-20
max-w-lg
text-right
text-white
"

>







<h1

className="
text-3xl
sm:text-4xl
md:text-5xl
font-semibold
leading-tight
"

>

{slide.title}

</h1>





<p

className="
mt-5
text-sm
sm:text-base
text-white/80
leading-7
max-w-sm
"

>

{slide.desc}

</p>





<Link


to="/products"


className="
inline-flex
mt-8
text-sm
border-b
border-white
pb-2
hover:opacity-70
transition
"

>


اكتشف المجموعة


</Link>




</div>


</div>




</div>


</SwiperSlide>


))


}



</Swiper>


</section>


);

}