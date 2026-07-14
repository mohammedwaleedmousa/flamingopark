import {
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { cn } from "@/lib/utils";


interface Props {
  todayStats: {
    revenue: number;
    orders: number;
    visitors: number;
    conversion: number;

    revenueDelta: number;
    ordersDelta: number;
    visitorsDelta: number;
    conversionDelta: number;
  };

  currency: string;

  fmt: (value:number)=>string;

  clampPct:(value:number)=>number;
}


const TodayOverview = ({
  todayStats,
  currency,
  fmt,
  clampPct,
}:Props)=>{


const cards = [

{
title:"مبيعات اليوم",
value:`${fmt(todayStats.revenue)} ${currency}`,
delta:todayStats.revenueDelta,
icon:DollarSign,
theme:"emerald",
label:"الإيرادات",
},

{
title:"طلبات اليوم",
value:fmt(todayStats.orders),
delta:todayStats.ordersDelta,
icon:ShoppingCart,
theme:"blue",
progress:clampPct(Math.abs(todayStats.ordersDelta)),
label:"الطلبات",
},

{
title:"الزوار",
value:fmt(todayStats.visitors),
delta:todayStats.visitorsDelta,
icon:Users,
theme:"violet",
label:"العملاء",
},

{
title:"معدل التحويل",
value:`${todayStats.conversion}%`,
delta:todayStats.conversionDelta,
icon:Target,
theme:"pink",
progress:clampPct(todayStats.conversion),
label:"الأداء",
},

];



const themes:any = {

emerald:{
icon:"bg-emerald-50 text-emerald-600",
gradient:"from-emerald-400/20"
},

blue:{
icon:"bg-blue-50 text-blue-600",
gradient:"from-blue-400/20"
},

violet:{
icon:"bg-violet-50 text-violet-600",
gradient:"from-violet-400/20"
},

pink:{
icon:"bg-pink-50 text-pink-600",
gradient:"from-pink-400/20"
}

};



return (

<section
dir="rtl"
className="
grid
grid-cols-1
sm:grid-cols-2
xl:grid-cols-4
gap-5
"
>


{cards.map((card)=>{


const Icon = card.icon;
const theme = themes[card.theme];


return (

<div
key={card.title}
className="
group
relative
overflow-hidden
rounded-[28px]
border
border-slate-100
bg-white
p-6
shadow-sm
transition-all
duration-300
hover:-translate-y-1
hover:shadow-2xl
"
>


{/* Background Glow */}

<div
className={cn(
"absolute -top-16 -left-16 w-40 h-40 rounded-full blur-3xl opacity-40 bg-gradient-to-br",
theme.gradient,
"to-transparent"
)}
/>



<div className="relative">


<div className="flex items-start justify-between">


<div
className={cn(
"w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm",
theme.icon
)}
>

<Icon
className="w-6 h-6"
/>

</div>



<div
className={cn(
"flex items-center gap-1.5",
"text-xs font-semibold",
"px-3 py-1.5",
"rounded-full",

card.delta >=0
?
"bg-emerald-50 text-emerald-700"
:
"bg-rose-50 text-rose-700"

)}
>


{
card.delta >=0
?
<TrendingUp className="w-4 h-4"/>
:
<TrendingDown className="w-4 h-4"/>
}


<span>
{card.delta>=0?"+":""}
{card.delta.toFixed(1)}%
</span>


</div>


</div>





<div className="mt-6">


<p className="
text-xs
font-medium
text-slate-400
">
{card.label}
</p>



<h2
className="
mt-2
text-3xl
font-black
tracking-tight
text-slate-900
"
>

{card.value}

</h2>


<p
className="
mt-1
text-sm
text-slate-500
"
>
{card.title}
</p>


</div>





{card.progress !== undefined && (

<div className="mt-6">


<div className="
flex
justify-between
mb-2
text-[11px]
text-slate-400
">

<span>
التقدم
</span>


<span>
{Math.round(card.progress)}%
</span>


</div>



<div
className="
h-2
rounded-full
bg-slate-100
overflow-hidden
"
>


<div
className="
h-full
rounded-full
bg-gradient-to-r
from-pink-500
to-violet-500
transition-all
duration-700
"
style={{
width:`${card.progress}%`
}}
/>


</div>


</div>

)}



<div
className="
mt-6
pt-4
border-t
border-slate-100
text-[11px]
text-slate-400
"
>
مقارنة باليوم السابق
</div>


</div>


</div>


)

})}


</section>

)

}


export default TodayOverview;