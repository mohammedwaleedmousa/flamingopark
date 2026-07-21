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




  return (
  <div className="min-h-screen max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-8" dir="rtl">
    <AdminPageHeader
      category="الماركات"
      title="إدارة صفحة الماركة"
      description="إنشاء وتخصيص صفحة عرض الماركة داخل المتجر"
      actions={[
        {
          label:"رجوع",
          icon:ArrowRight,
          onClick:()=>navigate("/admin/brand-pages"),
          variant:"secondary"
        }
      ]}
    />

    <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
      <div className="p-6 md:p-8 space-y-8">

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-heading font-semibold">بيانات الماركة</h2>
            <p className="text-sm text-muted-foreground mt-1">اختر الماركة التي تريد إدارة صفحتها</p>
          </div>

          <div className="bg-muted/30 border border-border rounded-2xl p-4">
            <Label className="mb-2 block">اختر الماركة</Label>

            <Select value={brandId} onValueChange={(value)=>setBrandId(value)}>
              <SelectTrigger className="h-12 rounded-xl bg-background">
                <SelectValue placeholder="اختر ماركة"/>
              </SelectTrigger>

              <SelectContent>
                {brands.map((brand:any)=>(
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>


        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-heading font-semibold">محتوى الصفحة</h2>
            <p className="text-sm text-muted-foreground mt-1">العنوان والوصف الظاهر للعميل</p>
          </div>

          <div className="space-y-4">

            <div className="space-y-2">
              <Label>عنوان الصفحة</Label>
              <Input
                value={form.title}
                onChange={(e)=>setForm({...form,title:e.target.value})}
                placeholder="Gucci Collection"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>وصف الماركة</Label>
              <Textarea
                rows={6}
                value={form.description}
                onChange={(e)=>setForm({...form,description:e.target.value})}
                className="rounded-xl resize-none"
                placeholder="اكتب وصفاً أنيقاً للماركة..."
              />
            </div>

          </div>
        </section>


        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-heading font-semibold">الصورة الرئيسية</h2>
            <p className="text-sm text-muted-foreground mt-1">الصورة التي تظهر في أعلى صفحة الماركة</p>
          </div>

          <div className="border border-dashed border-border rounded-3xl p-5 bg-muted/20">

            {form.hero_image ? (
              <div className="relative group overflow-hidden rounded-2xl">
                <img
                  src={form.hero_image}
                  alt="hero"
                  loading="lazy"
                  className="w-full h-[280px] object-cover rounded-2xl"
                />

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition"/>
              </div>
            ) : (
              <div className="h-[220px] rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                لا توجد صورة رئيسية
              </div>
            )}

            <label className="mt-5 flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-background cursor-pointer hover:border-pink-400 hover:text-pink-500 transition">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Upload className="w-5 h-5"/>}
              <span>{uploading ? "جاري رفع الصورة..." : "رفع صورة جديدة"}</span>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e)=>{
                  const file=e.target.files?.[0];
                  if(file) uploadImage(file);
                }}
              />
            </label>

          </div>
        </section>


        <section className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-5">
          <div>
            <h3 className="font-medium">حالة الصفحة</h3>
            <p className="text-sm text-muted-foreground">تفعيل ظهور صفحة الماركة للعملاء</p>
          </div>

          <Switch
            checked={form.is_active}
            onCheckedChange={(value)=>setForm({...form,is_active:value})}
          />
        </section>


        <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-border">

          <Button
            className="h-12 px-8 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/20"
            onClick={()=>save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? <Loader2 className="w-5 h-5 animate-spin"/> : "حفظ صفحة الماركة"}
          </Button>

          <Button
            className="h-12 rounded-xl"
            variant="outline"
            onClick={()=>navigate("/admin/brand-pages")}
          >
            إلغاء
          </Button>

        </div>

      </div>
    </div>
  </div>
);


};

export default AdminBrandPageEditor;