import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import AdminPageHeader from "@/components/admin/AdminPageHeader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { toast } from "@/hooks/use-toast";

import {
  ArrowRight,
  Search,
  Save,
  Loader2,
  Trash2,
  Package,
} from "lucide-react";


interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  price: number;
  images: string[] | null;
  brand_id: string | null;
  category_id: string | null;
  is_active: boolean;
}


interface Section {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
}



const AdminBrandSectionProductsPage = () => {

  const { id } = useParams<{ id:string }>();

  const navigate = useNavigate();

  const queryClient = useQueryClient();


  const [search, setSearch] = useState("");

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);



  /*
    جلب بيانات القسم
  */

  const {
    data: section,
    isLoading: sectionLoading
  } = useQuery({

    queryKey:["brand-section", id],

    enabled:!!id,

    queryFn:async()=>{

      const {data,error}=await (supabase as any)
        .from("brand_sections")
        .select(`
          id,
          name,
          slug,
          image_url,
          description
        `)
        .eq("id",id)
        .single();


      if(error) throw error;

      return data as Section;

    }

  });



  /*
    جلب كل المنتجات
  */

  const {
    data: products=[],
    isLoading:productsLoading
  } = useQuery({

    queryKey:["all-products-brand-section"],

    queryFn:async()=>{

      const {data,error}=await (supabase as any)
        .from("products")
        .select(`
          id,
          name,
          name_ar,
          price,
          images,
          brand_id,
          category_id,
          is_active
        `)
        .eq("is_active",true)
        .order("created_at",{ascending:false});


      if(error) throw error;


      return data as Product[];

    }

  });



  /*
    جلب المنتجات المرتبطة بالقسم
  */

  const {
    data: linkedProducts=[]
  } = useQuery({

    queryKey:[
      "brand-section-products",
      id
    ],

    enabled:!!id,

    queryFn:async()=>{


      const {data,error}=await (supabase as any)
        .from("brand_section_products")
        .select("product_id")
        .eq("section_id",id);


      if(error) throw error;


      const ids=(data || [])
        .map((x:any)=>x.product_id);


      setSelectedProducts(ids);


      return ids;

    }

  });




  /*
    فلترة البحث
  */


  const filteredProducts = useMemo(()=>{


    return products.filter((product)=>{


      const text =
      `${product.name}
       ${product.name_ar || ""}
      `.toLowerCase();


      return text.includes(search.toLowerCase());


    });


  },[
    products,
    search
  ]);




  /*
    اختيار منتج
  */


  const toggleProduct=(productId:string)=>{


    setSelectedProducts(prev=>{


      if(prev.includes(productId)){

        return prev.filter(id=>id!==productId);

      }


      return [
        ...prev,
        productId
      ];

    });


  };




  /*
    حفظ المنتجات داخل القسم
  */


  const saveProducts = useMutation({

    mutationFn:async()=>{


      if(!id)
        throw new Error("القسم غير موجود");



      // حذف العلاقات القديمة

      const {error:deleteError}=await (supabase as any)
        .from("brand_section_products")
        .delete()
        .eq("section_id",id);



      if(deleteError)
        throw deleteError;




      if(selectedProducts.length){


        const rows =
        selectedProducts.map(productId=>({

          section_id:id,

          product_id:productId

        }));


        const {error:insertError}=await (supabase as any)
          .from("brand_section_products")
          .insert(rows);



        if(insertError)
          throw insertError;

      }


    },


    onSuccess:()=>{


      queryClient.invalidateQueries({
        queryKey:[
          "brand-section-products",
          id
        ]
      });


      toast({
        title:"تم حفظ منتجات القسم"
      });


    },


    onError:(e:any)=>{


      toast({

        title:"حدث خطأ",

        description:e.message,

        variant:"destructive"

      });


    }


  });




  const removeProduct=(productId:string)=>{


    setSelectedProducts(prev=>
      prev.filter(id=>id!==productId)
    );


  };
    return (

    <div
      className="space-y-8 max-w-[1400px] mx-auto p-6"
      dir="rtl"
    >


      <AdminPageHeader

        category="الماركات"

        title={
          section
          ? `منتجات قسم ${section.name}`
          : "منتجات القسم"
        }

        description="إدارة المنتجات المرتبطة بهذا القسم"

        actions={[
          {
            label:"رجوع",
            icon:ArrowRight,
            variant:"secondary",
            onClick:()=>navigate(-1)
          }
        ]}

      />



      {
        sectionLoading ?

        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin w-10 h-10"/>
        </div>

        :

        <>

        {/* معلومات القسم */}

        <Card className="
          overflow-hidden
          border-border/60
          shadow-sm
        ">

          <CardContent className="
            flex
            gap-6
            items-center
            p-6
          ">


            {
              section?.image_url &&

              <img

                src={section.image_url}
                loading="lazy"
                className="
                  w-28
                  h-28
                  rounded-2xl
                  object-cover
                  shadow
                "

              />

            }



            <div className="space-y-2">


              <h2 className="
                text-2xl
                font-bold
              ">

                {section?.name}

              </h2>


              <p className="
                text-muted-foreground
              ">

                {section?.description ||
                 "لا يوجد وصف"}

              </p>


              <Badge variant="secondary">

                {selectedProducts.length}
                {" "}
                منتج مرتبط

              </Badge>


            </div>


          </CardContent>

        </Card>





        <div className="
          grid
          grid-cols-1
          lg:grid-cols-3
          gap-6
        ">


          {/* المنتجات */}

          <Card className="
            lg:col-span-2
          ">


            <CardHeader>


              <div className="
                flex
                justify-between
                items-center
                gap-4
              ">


                <CardTitle className="
                  flex
                  items-center
                  gap-2
                ">

                  <Package
                    className="w-5 h-5"
                  />

                  جميع المنتجات


                </CardTitle>



                <div className="
                  relative
                  w-72
                ">


                  <Search
                    className="
                      absolute
                      right-3
                      top-3
                      w-4
                      h-4
                      text-muted-foreground
                    "
                  />


                  <Input

                    placeholder="بحث عن منتج..."

                    value={search}

                    onChange={(e)=>
                      setSearch(e.target.value)
                    }

                    className="
                      pr-10
                    "

                  />


                </div>


              </div>


            </CardHeader>



            <CardContent>


              {
                productsLoading ?

                <div className="
                  py-16
                  flex
                  justify-center
                ">

                  <Loader2
                    className="
                      animate-spin
                    "
                  />

                </div>


                :

                <div className="
                  grid
                  grid-cols-1
                  md:grid-cols-2
                  gap-4
                  max-h-[600px]
                  overflow-y-auto
                  p-1
                ">


                {
                  filteredProducts.map(product=>(


                    <div

                      key={product.id}

                      onClick={()=>
                        toggleProduct(product.id)
                      }

                      className={`
                        cursor-pointer
                        flex
                        gap-4
                        items-center
                        border
                        rounded-xl
                        p-3
                        transition
                        hover:shadow-md
                        ${
                          selectedProducts.includes(product.id)
                          ?
                          "border-primary bg-primary/5"
                          :
                          ""
                        }
                      `}

                    >



                      <Checkbox

                        checked={
                          selectedProducts.includes(product.id)
                        }

                        onCheckedChange={()=>
                          toggleProduct(product.id)
                        }

                      />



                      {
                        product.images?.[0] &&

                        <img

                          src={
                            product.images[0]
                          }
                          loading="lazy"
                          className="
                            w-16
                            h-16
                            rounded-lg
                            object-cover
                          "

                        />

                      }




                      <div className="flex-1">


                        <h3 className="
                          font-medium
                        ">

                          {
                            product.name_ar ||
                            product.name
                          }

                        </h3>



                        <p className="
                          text-sm
                          text-muted-foreground
                        ">

                          {product.price}
                          {" "}
                          ر.س

                        </p>


                      </div>


                    </div>


                  ))

                }


                </div>


              }


            </CardContent>


          </Card>






          {/* المنتجات المختارة */}

          <Card>


            <CardHeader>


              <CardTitle>

                المنتجات المختارة

              </CardTitle>


            </CardHeader>



            <CardContent>


              <div className="
                space-y-3
                max-h-[600px]
                overflow-y-auto
              ">


              {


              selectedProducts.length === 0 ?


              <div className="
                text-center
                py-10
                text-muted-foreground
              ">

                لم يتم اختيار منتجات

              </div>


              :


              selectedProducts.map(productId=>{


                const product =
                products.find(
                  p=>p.id===productId
                );


                if(!product)
                  return null;



                return (

                <div

                  key={product.id}

                  className="
                    flex
                    items-center
                    gap-3
                    border
                    rounded-xl
                    p-3
                  "

                >


                  {
                    product.images?.[0] &&

                    <img
                      loading="lazy"
                      src={product.images[0]}

                      className="
                        w-12
                        h-12
                        rounded-lg
                        object-cover
                      "

                    />

                  }



                  <div className="flex-1">


                    <p className="
                      text-sm
                      font-medium
                    ">

                      {
                        product.name_ar ||
                        product.name
                      }

                    </p>


                  </div>




                  <Button

                    size="icon"

                    variant="ghost"

                    className="
                      text-destructive
                    "

                    onClick={()=>
                      removeProduct(product.id)
                    }

                  >

                    <Trash2
                      className="w-4 h-4"
                    />

                  </Button>



                </div>


                );


              })


              }


              </div>


            </CardContent>


          </Card>



        </div>





        <div className="
          flex
          justify-end
        ">


          <Button

            size="lg"

            onClick={()=>
              saveProducts.mutate()
            }

            disabled={
              saveProducts.isPending
            }

            className="
              min-w-48
              gap-2
            "

          >

            {
              saveProducts.isPending &&

              <Loader2
                className="
                  w-5
                  h-5
                  animate-spin
                "
              />

            }


            <Save
              className="w-5 h-5"
            />


            حفظ المنتجات


          </Button>


        </div>


        </>

      }


    </div>

  );

};


export default AdminBrandSectionProductsPage;