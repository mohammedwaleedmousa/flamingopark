import {
  AlertTriangle,
  ArrowUpRight,
  Package,
} from "lucide-react";

import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";


interface LowStockProduct {
  id: string;
  name_ar: string;
  stock: number;
}


interface Props {
  pendingCount: number;
  lowStock: LowStockProduct[];
  rangeText: string;
}



const DashboardAlerts = ({
  pendingCount,
  lowStock,
  rangeText,
}: Props) => {


  if (pendingCount === 0 && lowStock.length === 0) {
    return null;
  }



return (

<section
dir="rtl"
className="
grid
md:grid-cols-2
gap-5
"
>




{pendingCount > 0 && (

<div
className="
relative
overflow-hidden
rounded-[28px]
border
border-amber-200
bg-white
p-5
shadow-sm
transition-all
duration-300
hover:shadow-xl
"
>


<div
className="
absolute
inset-0
opacity-[0.06]
bg-gradient-to-br
from-amber-400
to-orange-500
"
/>



<div className="relative">


<div
className="
flex
items-center
justify-between
gap-4
"
>


<div
className="
flex
items-center
gap-4
"
>


<div
className="
relative
"
>

<div
className="
w-12
h-12
rounded-2xl
bg-gradient-to-br
from-amber-400
to-orange-500
flex
items-center
justify-center
shadow-lg
"
>

<AlertTriangle
className="
w-6
h-6
text-white
"
/>

</div>


<span
className="
absolute
-top-1
-right-1
w-3
h-3
rounded-full
bg-red-500
ring-2
ring-white
animate-pulse
"
/>


</div>





<div>

<h3
className="
text-sm
font-bold
text-slate-900
"
>
{pendingCount} طلبات بانتظار المراجعة
</h3>


<p
className="
mt-1
text-xs
text-slate-400
"
>
{rangeText}
</p>


</div>


</div>






<Button
asChild
size="sm"
variant="outline"
className="
rounded-xl
border-amber-300
text-amber-700
hover:bg-amber-50
"
>

<Link to="/admin/orders">

عرض

<ArrowUpRight
className="
w-4
h-4
mr-1
"
/>

</Link>


</Button>




</div>


</div>


</div>

)}





{lowStock.length > 0 && (

<div
className="
relative
overflow-hidden
rounded-[28px]
border
border-rose-200
bg-white
p-5
shadow-sm
transition-all
duration-300
hover:shadow-xl
"
>


<div
className="
absolute
inset-0
opacity-[0.05]
bg-gradient-to-br
from-rose-500
to-pink-500
"
/>



<div className="relative">


<div
className="
flex
items-center
justify-between
mb-4
"
>


<div
className="
flex
items-center
gap-3
"
>


<div
className="
w-10
h-10
rounded-2xl
bg-rose-50
flex
items-center
justify-center
"
>

<Package
className="
w-5
h-5
text-rose-600
"
/>


</div>


<div>

<h3
className="
text-sm
font-bold
text-slate-900
"
>
مخزون منخفض
</h3>


<p
className="
text-xs
text-slate-400
"
>
منتجات تحتاج متابعة
</p>


</div>


</div>





<Button
asChild
size="sm"
variant="ghost"
className="
text-rose-600
hover:bg-rose-50
"
>

<Link to="/admin/products">
إدارة
</Link>


</Button>



</div>






<ul
className="
space-y-2
"
>

{lowStock.map((product)=>(

<li
key={product.id}
className="
flex
items-center
justify-between
rounded-xl
bg-slate-50
px-3
py-2
text-xs
"
>


<span
className="
truncate
font-medium
text-slate-700
"
>
{product.name_ar}
</span>



<span
className="
text-rose-600
font-semibold
tabular-nums
"
>
{product.stock} قطعة
</span>


</li>

))}


</ul>


</div>


</div>

)}



</section>

);


};


export default DashboardAlerts;