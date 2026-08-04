import { Link } from "react-router-dom";
import { BarChart3, CalendarDays, Sparkles, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/lib/analytics/dateRange";


interface Props {
  rangeText: string;
}


const DashboardHeader = ({
  rangeText,
}: Props) => {

return (

  <header dir="rtl" className="border border-border bg-card px-5 py-6 md:px-6">
<div>


<div
className="
flex
flex-col
xl:flex-row
xl:items-center
xl:justify-between
          gap-5
"
>



{/* Title */}

<div>


<div
className="
flex
items-center
          gap-2 text-xs text-muted-foreground
"
>

<Sparkles
className="
w-4
h-4
          text-primary
"
/>

لوحة التحكم


</div>




<h1
className="
          mt-2 text-3xl font-heading text-foreground md:text-4xl
"
>
نظرة عامة
</h1>




<div
className="
          mt-4 inline-flex items-center gap-2 border border-border bg-background px-3 py-2 text-xs text-muted-foreground
"
>


<CalendarDays
className="
w-4
h-4
          text-primary
"
/>


<span>
الفترة:
</span>



<span
className="
          font-medium text-foreground
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