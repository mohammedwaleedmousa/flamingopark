import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";


const slides = [
  {
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2200&q=90",

    tag: "FLAMINGO PARK",

    title:
      "أناقة عصرية\nبتفاصيل استثنائية",

    desc:
      "اكتشف تشكيلتنا المختارة من الأزياء والإكسسوارات المصممة لتمنحك تجربة تسوق مختلفة.",
  },
];



export default function VisionProHero() {


  const ref = useRef<HTMLDivElement>(null);



  const { scrollYProgress } = useScroll({

    target: ref,

    offset:[
      "start start",
      "end start"
    ]

  });



  const progress = useSpring(
    scrollYProgress,
    {
      stiffness:100,
      damping:30,
    }
  );



  const imageScale = useTransform(
    progress,
    [0,1],
    [1.12,1]
  );


  const imageY = useTransform(
    progress,
    [0,1],
    ["0%","10%"]
  );



  const contentY = useTransform(
    progress,
    [0,1],
    ["0%","-20%"]
  );


  const opacity = useTransform(
    progress,
    [0,.85,1],
    [1,1,0]
  );




return (

<section
ref={ref}
className="
relative
h-[180vh]
bg-black
"
>


<div

className="
sticky
top-0

h-screen

overflow-hidden

"

>



{/* IMAGE */}


<motion.div

style={{
scale:imageScale,
y:imageY
}}

className="
absolute
inset-0

"

>


<img

src={slides[0].image}

className="
w-full
h-full

object-cover

"

/>


</motion.div>







{/* OVERLAY */}


<div

className="
absolute
inset-0

bg-gradient-to-r

from-black/70

via-black/40

to-black/10

"

/>


<div

className="
absolute
inset-0

bg-gradient-to-t

from-black/60

to-transparent

"

/>









{/* CONTENT */}


<motion.div

style={{
y:contentY,
opacity
}}

className="
relative

h-full

flex

items-center

"

>


<div

className="
px-6

md:px-24

max-w-3xl

text-white

"

>



<p

className="
text-xs

tracking-[0.5em]

text-white/70

mb-6

uppercase

"

>

{slides[0].tag}

</p>







<h1

className="
text-5xl

md:text-7xl

font-light

leading-tight

whitespace-pre-line

"

>

{slides[0].title}

</h1>







<p

className="
mt-6

max-w-lg

text-white/70

leading-relaxed

"

>

{slides[0].desc}

</p>








<div

className="
mt-10

flex

gap-4

"

>



<button

className="
px-9

py-4

rounded-full

bg-white

text-black

text-sm

transition

hover:bg-white/90

"

>

اكتشف المنتجات

</button>




<button

className="
px-9

py-4

rounded-full

border

border-white/40

backdrop-blur-md

text-sm

hover:bg-white/10

transition

"

>

عن فلامنجو

</button>



</div>







</div>


</motion.div>









{/* BOTTOM */}



<motion.div

style={{
opacity
}}

className="
absolute

bottom-10

left-6

right-6

md:left-24

md:right-24


flex

justify-between

items-center

"

>


<span

className="
text-white/50

text-xs

tracking-[0.4em]

"

>

NEW COLLECTION

</span>




<div

className="
w-48

h-[2px]

bg-white/20

overflow-hidden

"

>

<motion.div

style={{
scaleX:progress
}}

className="
h-full

bg-white

origin-left

"

/>


</div>



</motion.div>





</div>


</section>

);

}