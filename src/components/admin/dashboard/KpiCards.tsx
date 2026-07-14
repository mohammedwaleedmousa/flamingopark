import {
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";


interface KpiItem {
  label: string;
  value: string;
  delta: number;
  icon: any;
  tint: string;
  bg: string;
}


interface Props {
  kpis: KpiItem[];
  loading: boolean;
}



const KpiCards = ({
  kpis,
  loading,
}: Props) => {


  return (

    <section
      dir="rtl"
      className="
      grid
      grid-cols-2
      lg:grid-cols-4
      gap-4
      "
    >


      {kpis.map((k) => {


        const Icon = k.icon;


        return (

          <div
            key={k.label}
            className="
            relative
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200
            bg-white
            p-6
            shadow-sm
            transition-all
            duration-300
            hover:-translate-y-1
            hover:shadow-xl
            "
          >


            <div
              className="
              absolute
              top-0
              right-0
              w-32
              h-32
              rounded-full
              bg-gradient-to-br
              from-pink-200
              via-purple-100
              to-transparent
              opacity-40
              blur-2xl
              "
            />



            <div className="relative">


              <div
                className="
                flex
                items-center
                justify-between
                "
              >


                <div
                  className={cn(
                    "p-3 rounded-2xl",
                    k.bg
                  )}
                >

                  <Icon
                    className={cn(
                      "w-6 h-6",
                      k.tint
                    )}
                  />

                </div>




                <span
                  className={cn(
                    "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium",
                    k.delta >= 0
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-rose-700 bg-rose-50"
                  )}
                >

                  {
                    k.delta >= 0
                      ?
                      <TrendingUp className="w-3.5 h-3.5" />
                      :
                      <TrendingDown className="w-3.5 h-3.5" />
                  }


                  {Math.abs(k.delta).toFixed(1)}%

                </span>


              </div>




              <div className="mt-6">


                <p
                  className="
                  text-xs
                  text-slate-500
                  font-medium
                  "
                >
                  {k.label}
                </p>



                {
                  loading

                  ?

                  <Skeleton
                    className="
                    h-8
                    w-28
                    mt-3
                    rounded-lg
                    "
                  />


                  :

                  <p
                    className="
                    text-2xl
                    font-semibold
                    text-slate-900
                    mt-3
                    tabular-nums
                    "
                  >
                    {k.value}
                  </p>

                }


              </div>



            </div>



          </div>

        );


      })}


    </section>

  );

};


export default KpiCards;