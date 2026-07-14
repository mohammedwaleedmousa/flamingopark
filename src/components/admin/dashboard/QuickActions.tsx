import {
  PackagePlus,
  Receipt,
  UserPlus,
  Plus,
  ArrowUpLeft,
} from "lucide-react";

import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";


interface ActionItem {
  title: string;
  description: string;
  icon: React.ElementType;
  url: string;
  style: string;
  iconStyle: string;
}


const actions: ActionItem[] = [
  {
    title: "إضافة منتج",
    description: "إنشاء منتج جديد",
    icon: PackagePlus,
    url: "/admin/products/new",
    style:
      "hover:border-pink-300 hover:bg-pink-50",
    iconStyle:
      "text-pink-600",
  },

  {
    title: "الطلبات",
    description: "مراجعة الطلبات",
    icon: Receipt,
    url: "/admin/orders",
    style:
      "hover:border-blue-300 hover:bg-blue-50",
    iconStyle:
      "text-blue-600",
  },

  {
    title: "العملاء",
    description: "إدارة العملاء",
    icon: UserPlus,
    url: "/admin/customers",
    style:
      "hover:border-green-300 hover:bg-green-50",
    iconStyle:
      "text-green-600",
  },

  {
    title: "الأقسام",
    description: "إدارة التصنيفات",
    icon: Plus,
    url: "/admin/categories",
    style:
      "hover:border-violet-300 hover:bg-violet-50",
    iconStyle:
      "text-violet-600",
  },
];



const QuickActions = () => {


return (

<section
dir="rtl"
className="
rounded-[30px]
bg-white
border
border-slate-100
p-6
shadow-sm
"
>


<div
className="
flex
items-center
justify-between
mb-6
"
>


<div>

<h2
className="
text-lg
font-black
text-slate-900
"
>
الإجراءات السريعة
</h2>


<p
className="
text-xs
text-slate-400
mt-1
"
>
الوصول السريع للعمليات الأساسية
</p>


</div>


<div
className="
w-10
h-10
rounded-2xl
bg-pink-50
flex
items-center
justify-center
"
>

<Plus
className="
w-5
h-5
text-pink-600
"
/>

</div>


</div>





<div
className="
grid
grid-cols-1
sm:grid-cols-2
lg:grid-cols-4
gap-4
"
>


{actions.map((action)=>{


const Icon = action.icon;


return (

<Link
key={action.title}
to={action.url}

className={cn(
`
group
relative
overflow-hidden

rounded-[26px]

border
border-slate-100

bg-gradient-to-br
from-white
to-slate-50

p-5

transition-all
duration-300

hover:-translate-y-1
hover:shadow-xl
`,
action.style
)}

>



<div
className="
flex
items-start
justify-between
"
>


<div
className="
relative
"
>


<div
className="
absolute
inset-0
rounded-2xl
bg-current
opacity-10
blur-xl
"
/>



<div
className="
relative

w-14
h-14

rounded-2xl

bg-white

shadow-sm

flex
items-center
justify-center

group-hover:scale-110

transition-transform
duration-300
"
>


<Icon

className={cn(
`
w-7
h-7
`,
action.iconStyle
)}

/>


</div>


</div>




<ArrowUpLeft
className="
w-5
h-5
text-slate-300

transition-all
duration-300

group-hover:text-slate-600
group-hover:-translate-y-1
"
/>



</div>





<div className="mt-6">


<h3
className="
text-base
font-bold
text-slate-800
"
>
{action.title}
</h3>


<p
className="
mt-2
text-xs
text-slate-400
"
>
{action.description}
</p>


</div>





<div
className="
absolute
bottom-0
right-0
h-1
w-0

bg-gradient-to-l
from-pink-500
to-violet-500

transition-all
duration-500

group-hover:w-full
"
/>



</Link>

);


})}


</div>


</section>


);

};


export default QuickActions;