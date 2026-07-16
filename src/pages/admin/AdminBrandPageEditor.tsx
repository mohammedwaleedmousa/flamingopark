import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import AdminPageHeader from "@/components/admin/AdminPageHeader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "@/hooks/use-toast";

import {
  Loader2,
  Upload,
  ArrowRight
} from "lucide-react";


const AdminBrandPageEditor = () => {

  const { id } = useParams<{id:string}>();

  const navigate = useNavigate();

  const queryClient = useQueryClient();


  const [brandId,setBrandId] = useState(id || "");


  const [form,setForm] = useState({

    title:"",
    description:"",
    hero_image:"",
    is_active:true

  });


  const [uploading,setUploading] = useState(false);



  const {data:brands=[]} = useQuery({

    queryKey:["brands-picker"],

    queryFn:async()=>{

      const {data,error}=await supabase
      .from("brands")
      .select("id,name,slug")
      .eq("is_active",true)
      .order("name");


      if(error) throw error;


      return data || [];

    }

  });



  const {isLoading}=useQuery({

    queryKey:["brand-page",brandId],

    enabled:!!brandId,


    queryFn:async()=>{


      const {data,error}=await supabase
      .from("brand_pages")
      .select("*")
      .eq("brand_id",brandId)
      .maybeSingle();


      if(error) throw error;



      if(data){

        setForm({

          title:data.title || "",

          description:data.description || "",

          hero_image:data.hero_image || "",

          is_active:data.is_active ?? true

        });

      }
      else{

        setForm({

          title:"",
          description:"",
          hero_image:"",
          is_active:true

        });

      }


      return data;

    }

  });



  const uploadImage = async(file:File)=>{


    setUploading(true);


    try{


      const ext=file.name.split(".").pop();


      const path=
      `brand-pages/${Date.now()}.${ext}`;



      const {error}=await supabase.storage
      .from("uploads")
      .upload(
        path,
        file,
        {
          upsert:true
        }
      );


      if(error)
        throw error;



      const {data}=supabase.storage
      .from("uploads")
      .getPublicUrl(path);



      setForm(prev=>({

        ...prev,

        hero_image:data.publicUrl

      }));



      toast({
        title:"تم رفع الصورة"
      });


    }
    catch(error:any){


      toast({

        title:"خطأ رفع الصورة",

        description:error.message,

        variant:"destructive"

      });


    }
    finally{

      setUploading(false);

    }


  };




  const save=useMutation({

    mutationFn:async()=>{


      if(!brandId)
        throw new Error("اختر الماركة");


      const payload={

        brand_id:brandId,

        title:form.title,

        description:form.description,

        hero_image:form.hero_image,

        is_active:form.is_active

      };



      const {data,error}=await supabase
      .from("brand_pages")
      .upsert(

        payload,

        {
          onConflict:"brand_id"
        }

      )
      .select()
      .single();



      if(error)
        throw error;


      return data;


    },


    onSuccess:()=>{


      queryClient.invalidateQueries();


      toast({

        title:"تم حفظ صفحة الماركة"

      });


      navigate("/admin/brand-pages");


    },


    onError:(error:any)=>{


      toast({

        title:"خطأ",

        description:error.message,

        variant:"destructive"

      });


    }


  });



  if(isLoading){

    return(

      <div className="flex justify-center py-20">

        <Loader2 className="w-8 h-8 animate-spin"/>

      </div>

    );

  }




  return(

    <div
      className="max-w-3xl mx-auto space-y-6"
      dir="rtl"
    >


      <AdminPageHeader

        category="الماركات"

        title="إدارة صفحة الماركة"

        actions={[
          {
            label:"رجوع",
            icon:ArrowRight,
            onClick:()=>navigate("/admin/brand-pages"),
            variant:"secondary"
          }
        ]}

      />



      <div className="bg-card border rounded-xl p-6 space-y-6">


        <div className="space-y-2">

          <Label>
            اختر الماركة
          </Label>


          <Select

            value={brandId}

            onValueChange={(value)=>setBrandId(value)}

          >

            <SelectTrigger>

              <SelectValue placeholder="اختر ماركة"/>

            </SelectTrigger>


            <SelectContent>


              {
                brands.map((brand:any)=>(

                  <SelectItem

                    key={brand.id}

                    value={brand.id}

                  >

                    {brand.name}

                  </SelectItem>

                ))
              }


            </SelectContent>


          </Select>


        </div>



        <div className="space-y-2">

          <Label>
            عنوان الصفحة
          </Label>


          <Input

            value={form.title}

            onChange={(e)=>setForm({

              ...form,

              title:e.target.value

            })}

            placeholder="Gucci Collection"

          />

        </div>




        <div className="space-y-2">

          <Label>
            وصف الماركة
          </Label>


          <Textarea

            rows={5}

            value={form.description}

            onChange={(e)=>setForm({

              ...form,

              description:e.target.value

            })}

          />

        </div>




        <div className="space-y-3">


          <Label>
            صورة الهيرو
          </Label>



          {
            form.hero_image &&

            <img

              src={form.hero_image}

              className="w-full h-48 object-cover rounded-xl"

              alt="hero"

            />

          }



          <label className="inline-flex items-center gap-2 border rounded-lg px-4 py-2 cursor-pointer">


            <Upload size={18}/>


            {
              uploading
              ?
              "جاري الرفع..."
              :
              "رفع صورة"
            }



            <input

              type="file"

              accept="image/*"

              className="hidden"

              onChange={(e)=>{

                const file=e.target.files?.[0];

                if(file)
                  uploadImage(file);

              }}

            />


          </label>


        </div>




        <div className="flex items-center gap-3">


          <Switch

            checked={form.is_active}

            onCheckedChange={(value)=>setForm({

              ...form,

              is_active:value

            })}

          />


          <Label>
            الصفحة نشطة
          </Label>


        </div>




        <div className="flex gap-3">


          <Button

            onClick={()=>save.mutate()}

            disabled={save.isPending}

          >

            {
              save.isPending
              ?
              <Loader2 className="w-4 h-4 animate-spin"/>
              :
              "حفظ"
            }

          </Button>



          <Button

            variant="outline"

            onClick={()=>navigate("/admin/brand-pages")}

          >

            إلغاء

          </Button>


        </div>


      </div>


    </div>

  );


};


export default AdminBrandPageEditor;