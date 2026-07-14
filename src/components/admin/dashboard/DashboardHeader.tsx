import { Link } from "react-router-dom";
import {
  CalendarDays,
  BarChart3,
  Wallet,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/lib/analytics/dateRange";


interface Props {
  rangeText: string;
}


const DashboardHeader = ({
  rangeText,
}: Props) => {

return (

<header
dir="rtl"
className="
relative
overflow-hidden

rounded-[32px]

border
border-slate-100

bg-white

px-6
py-7
lg:px-8

shadow-sm

"
>


{/* Background */}

<div
className="
absolute
inset-0
bg-gradient-to-br
from-pink-50/70
via-white
to-violet-50/60
"
/>



<div
className="
absolute
-top-24
-left-20
w-64
h-64
rounded-full
bg-pink-300/20
blur-3xl
"
/>


<div className="relative">


<div
className="
flex
flex-col
xl:flex-row
xl:items-center
xl:justify-between
gap-7
"
>



{/* Title */}

<div>


<div
className="
flex
items-center
gap-2
text-xs
text-slate-400
"
>

<Sparkles
className="
w-4
h-4
text-pink-500
"
/>

لوحة التحكم


</div>




<h1
className="
mt-3
text-4xl
font-black
tracking-tight
text-slate-900
"
>
نظرة عامة
</h1>




<div
className="
mt-5
inline-flex
items-center
gap-2

rounded-2xl

border
border-slate-200

bg-white/80

px-4
py-2.5

shadow-sm

text-xs
text-slate-500
"
>


<CalendarDays
className="
w-4
h-4
text-pink-600
"
/>


<span>
الفترة:
</span>



<span
className="
font-bold
text-slate-900
"
>
{rangeText}
</span>



</div>



</div>







{/* Actions */}

<div
className="
flex
flex-wrap
items-center
gap-3
"
>



<div
className="
flex
items-center
gap-2

rounded-2xl

border
border-slate-200

bg-white

px-3
py-2

shadow-sm
"
>

<DateRangePicker />

</div>






<Button
asChild
className="
h-11

rounded-2xl

px-5

bg-slate-900

hover:bg-slate-800

text-white

shadow-lg

transition-all

hover:-translate-y-0.5
"
>

<Link to="/admin/analytics">

<BarChart3
className="
w-4
h-4
ml-2
"
/>


التحليلات


</Link>

</Button>








<Button
asChild

className="
h-11

rounded-2xl

px-5

bg-white

border
border-slate-200

text-slate-700

hover:bg-pink-50

hover:text-pink-700

shadow-sm

transition-all

hover:-translate-y-0.5
"
>

<Link to="/admin/finance">


<Wallet
className="
w-4
h-4
ml-2

text-pink-600
"
/>


المالية


</Link>


</Button>





</div>



</div>


</div>


</header>


);

};


export default DashboardHeader;