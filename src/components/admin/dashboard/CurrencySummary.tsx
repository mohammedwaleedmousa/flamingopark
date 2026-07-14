import { Coins } from "lucide-react";


type CurrencyMode = "SAR" | "YER_SOUTH" | "YER_NORTH";


interface Props {

  revenueByCurrencyNative: Record<
    CurrencyMode,
    {
      revenue:number;
      orders:number;
    }
  >;


  revenueByCurrency: Record<
    CurrencyMode,
    {
      revenue:number;
      orders:number;
    }
  >;


  currencyMeta: Record<
    CurrencyMode,
    {
      label:string;
      symbol:string;
    }
  >;


  fmt:(value:number)=>string;

}



const CurrencySummary = ({
  revenueByCurrencyNative,
  revenueByCurrency,
  currencyMeta,
  fmt,

}:Props)=>{


const modes:CurrencyMode[]=[
  "SAR",
  "YER_SOUTH",
  "YER_NORTH",
];



const themes:any = {

SAR:{
icon:"bg-emerald-50 text-emerald-600",
gradient:"from-emerald-500/10",
badge:"bg-emerald-50 text-emerald-700"
},

YER_SOUTH:{
icon:"bg-pink-50 text-pink-600",
gradient:"from-pink-500/10",
badge:"bg-pink-50 text-pink-700"
},

YER_NORTH:{
icon:"bg-violet-50 text-violet-600",
gradient:"from-violet-500/10",
badge:"bg-violet-50 text-violet-700"
}

};




return (

<section
dir="rtl"
className="
grid
grid-cols-1
md:grid-cols-3
gap-5
"
>


{modes.map((mode)=>{


const theme = themes[mode];


return (

<div
key={mode}
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


<div
className={`
absolute
-top-20
-left-20
w-48
h-48
rounded-full
blur-3xl
bg-gradient-to-br
${theme.gradient}
to-transparent
`}
/>




<div className="relative">


<div
className="
flex
items-start
justify-between
"
>


<div>


<p
className="
text-xs
font-medium
text-slate-400
"
>
{currencyMeta[mode].label}
</p>



<div
className="
mt-3
flex
items-baseline
gap-2
"
>


<h2
className="
text-3xl
font-black
tracking-tight
text-slate-900
"
>

{fmt(
revenueByCurrencyNative[mode].revenue
)}

</h2>


<span
className="
text-sm
font-semibold
text-slate-500
"
>
{currencyMeta[mode].symbol}
</span>


</div>


</div>




<div
className={`
w-12
h-12
rounded-2xl
flex
items-center
justify-center
${theme.icon}
`}
>

<Coins
className="
w-6
h-6
"
/>


</div>



</div>






<div
className="
mt-5
flex
items-center
justify-between
"
>


<span
className="
text-xs
text-slate-400
"
>
عدد الطلبات
</span>


<span
className="
text-sm
font-bold
text-slate-700
"
>
{fmt(
revenueByCurrencyNative[mode].orders
)}
</span>



</div>







<div
className="
mt-5
rounded-2xl
bg-slate-50
p-3
"
>


<p
className="
text-xs
text-slate-400
mb-1
"
>
المعادل بالريال السعودي
</p>



<p
className="
text-sm
font-bold
text-violet-700
"
>

{fmt(
revenueByCurrency[mode].revenue
)}

ر.س

</p>



</div>





</div>


</div>


)

})}


</section>

)

}



export default CurrencySummary;