import {
  Activity,
  TrendingUp,
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";


interface Props {
  chart: any[];
  rangeDays: number;
  currency: string;
  fmt: (value:number)=>string;
}


const RevenueChart = ({
  chart,
  rangeDays,
  currency,
  fmt,
}: Props) => {


return (

<section
dir="rtl"
className="
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
hover:shadow-2xl
"
>


{/* Background decoration */}

<div
className="
absolute
-top-24
-left-20
w-60
h-60
rounded-full
bg-gradient-to-br
from-violet-400/20
via-pink-400/10
to-transparent
blur-3xl
"
/>



<div className="relative">


{/* Header */}

<div
className="
flex
items-center
justify-between
mb-7
"
>


<div>


<div
className="
flex
items-center
gap-2
"
>

<h2
className="
text-lg
font-bold
text-slate-900
"
>
الإيرادات اليومية
</h2>


<div
className="
flex
items-center
gap-1
px-2.5
py-1
rounded-full
bg-emerald-50
text-emerald-700
text-[11px]
font-semibold
"
>

<TrendingUp
className="w-3.5 h-3.5"
/>

نشط

</div>


</div>



<p
className="
mt-2
text-xs
text-slate-400
"
>
تحليل آخر {rangeDays} يوم
</p>


</div>




<div
className="
w-11
h-11
rounded-2xl
bg-violet-50
flex
items-center
justify-center
"
>

<Activity
className="
w-5
h-5
text-violet-600
"
/>

</div>



</div>





{/* Chart */}

<div
className="
h-72
w-full
"
>


<ResponsiveContainer
width="100%"
height="100%"
>


<AreaChart
data={chart}
margin={{
top:10,
right:0,
left:0,
bottom:0
}}
>



<defs>


<linearGradient
id="revenueGradient"
x1="0"
y1="0"
x2="0"
y2="1"
>


<stop
offset="0%"
stopColor="#ec4899"
stopOpacity={0.35}
/>


<stop
offset="100%"
stopColor="#ec4899"
stopOpacity={0}
/>


</linearGradient>


</defs>





<CartesianGrid
strokeDasharray="4 4"
stroke="#f8fafc"
vertical={false}
/>





<XAxis
dataKey="date"
tick={{
fontSize:11,
fill:"#94a3b8"
}}
tickLine={false}
axisLine={false}
/>





<YAxis
tick={{
fontSize:11,
fill:"#94a3b8"
}}
tickLine={false}
axisLine={false}
width={45}
/>





<YAxis
yAxisId="orders"
orientation="right"
tick={{
fontSize:11,
fill:"#94a3b8"
}}
tickLine={false}
axisLine={false}
width={36}
/>







<Tooltip


contentStyle={{
borderRadius:18,
border:"1px solid #f1f5f9",
boxShadow:"0 10px 30px rgba(0,0,0,0.08)",
direction:"rtl",
padding:"12px"
}}



formatter={(value:any,name:any)=>{


if(name==="طلبات"){

return [
fmt(Number(value)),
"طلبات"
];

}


return [
`${fmt(Number(value))} ${currency}`,
"إيراد"
];


}}


/>







<Area
type="monotone"
dataKey="revenue"
name="إيراد"
stroke="#ec4899"
strokeWidth={3}
fill="url(#revenueGradient)"
activeDot={{
r:6
}}
/>





<Area
yAxisId="orders"
type="monotone"
dataKey="orders"
name="طلبات"
stroke="#0ea5e9"
strokeWidth={2.5}
fill="transparent"
activeDot={{
r:5
}}
/>




</AreaChart>


</ResponsiveContainer>


</div>





{/* Footer */}

<div
className="
mt-5
pt-4
border-t
border-slate-100
flex
justify-between
text-xs
text-slate-400
"
>

<span>
الإيرادات
</span>


<span>
الطلبات
</span>


</div>



</div>


</section>


);

};


export default RevenueChart;