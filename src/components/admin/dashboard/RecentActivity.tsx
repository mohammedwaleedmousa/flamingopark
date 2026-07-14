import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";


interface RecentOrder {
  id: string;
  customer_name?: string;
  order_number: string;
  status: string;
  total: string | number;
}


interface Props {
  recent: RecentOrder[];
  loading: boolean;
  fmt: (value:number)=>string;
  toSar: (value:number, order:RecentOrder)=>number;
  statusTone: Record<string,string>;
  statusLabel: Record<string,string>;
}



const RecentActivity = ({
  recent,
  loading,
  fmt,
  toSar,
  statusTone,
  statusLabel,
}:Props)=>{


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
shadow-sm
transition-all
duration-300
hover:shadow-2xl
"
>


<div
className="
absolute
-top-24
-left-20
w-52
h-52
rounded-full
bg-gradient-to-br
from-pink-400/20
to-violet-400/10
blur-3xl
"
/>





<div
className="
relative
px-6
py-5
border-b
border-slate-100
flex
items-center
justify-between
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

<Clock3
className="
w-5
h-5
text-pink-500
"
/>


<h2
className="
text-lg
font-bold
text-slate-900
"
>
آخر النشاطات
</h2>


</div>


<p
className="
mt-1
text-xs
text-slate-400
"
>
آخر الطلبات المسجلة
</p>


</div>




<Button
asChild
variant="ghost"
size="sm"
className="
gap-2
text-pink-600
hover:text-pink-700
hover:bg-pink-50
"
>

<Link to="/admin/orders">

عرض الكل

<ArrowLeft
className="
w-4
h-4
"
/>

</Link>


</Button>



</div>







<div
className="
relative
divide-y
divide-slate-100
"
>



{
loading &&

Array.from({length:5}).map((_,i)=>(

<div
key={i}
className="
px-6
py-5
flex
items-center
justify-between
"
>

<div className="flex gap-3 items-center">

<Skeleton
className="
h-11
w-11
rounded-2xl
"
/>

<div className="space-y-2">

<Skeleton className="h-3 w-32"/>

<Skeleton className="h-2 w-20"/>

</div>

</div>


<Skeleton className="h-5 w-20"/>


</div>


))

}







{
!loading && recent.length===0 && (

<div
className="
p-10
text-center
text-sm
text-slate-400
"
>

لا يوجد نشاط حديث

</div>

)

}








{
!loading && recent.map((o,index)=>(


<div
key={o.id}
className="
group
relative
px-6
py-5
flex
items-center
justify-between
transition-all
hover:bg-slate-50/70
"
>


{/* Timeline */}

{
index !== recent.length-1 && (

<span
className="
absolute
right-[46px]
top-16
h-full
w-px
bg-slate-100
"
/>

)

}







<div
className="
flex
items-center
gap-4
min-w-0
"
>


<div
className="
relative
z-10
"
>

<div
className="
w-12
h-12
rounded-2xl
bg-gradient-to-br
from-pink-100
to-violet-100
flex
items-center
justify-center
text-pink-600
font-bold
shadow-sm
"
>

{
(o.customer_name || "?")
.charAt(0)
.toUpperCase()
}

</div>



<span
className="
absolute
-bottom-1
-right-1
w-3
h-3
rounded-full
bg-emerald-500
ring-2
ring-white
"
/>


</div>








<div
className="
min-w-0
"
>


<div
className="
flex
items-center
gap-2
"
>


<p
className="
text-sm
font-semibold
text-slate-800
truncate
"
>

{o.customer_name || "عميل"}

</p>


<span
className="
text-[10px]
px-2
py-1
rounded-full
bg-pink-50
text-pink-600
font-medium
"
>
طلب
</span>


</div>




<p
className="
mt-1
text-xs
text-slate-400
font-mono
"
>
#{o.order_number}
</p>



</div>


</div>









<div
className="
flex
flex-col
items-end
gap-2
"
>


<span
className={cn(
"text-[11px] px-3 py-1 rounded-full font-medium ring-1",
statusTone[o.status] ||
"bg-slate-50 text-slate-600 ring-slate-200"
)}
>

{
statusLabel[o.status] || o.status
}


</span>




<div
className="
text-sm
font-black
text-slate-900
tabular-nums
"
>

{fmt(
toSar(
parseFloat(String(o.total)) || 0,
o
)
)}

 <span className="text-xs text-slate-400">
ر.س
</span>

</div>




</div>





</div>


))

}



</div>



</section>

);


};


export default RecentActivity;