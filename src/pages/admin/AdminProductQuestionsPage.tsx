import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircleQuestion, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type Question = { id: string; product_id: string; content: string; content_ar: string; answer: string | null; answer_ar: string | null; author: string; created_at: string; products?: { name_ar?: string; name?: string; slug?: string } | null };

const AdminProductQuestionsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const { data: questions = [], isLoading } = useQuery({ queryKey: ["admin-product-questions"], queryFn: async () => { const { data, error } = await (supabase as any).from("product_questions").select("id,product_id,content,content_ar,answer,answer_ar,author,created_at,products(name_ar,name,slug)").order("created_at", { ascending: false }); if (error) throw error; return (data || []) as Question[]; }, staleTime: 30_000 });
  const save = useMutation({ mutationFn: async ({ id, answer }: { id: string; answer: string }) => { const clean = answer.trim(); if (!clean) throw new Error("اكتب الرد أولاً"); const { error } = await (supabase as any).from("product_questions").update({ answer: clean, answer_ar: clean }).eq("id", id); if (error) throw error; }, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin-product-questions"] }); toast({ title: "تم حفظ الرد" }); }, onError: (error: any) => toast({ title: "تعذر حفظ الرد", description: error?.message, variant: "destructive" }) });
  const remove = useMutation({ mutationFn: async (id: string) => { const { error } = await (supabase as any).from("product_questions").delete().eq("id", id); if (error) throw error; }, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["admin-product-questions"] }); toast({ title: "تم حذف السؤال" }); }, onError: (error: any) => toast({ title: "تعذر حذف السؤال", description: error?.message, variant: "destructive" }) });
  const filtered = useMemo(() => { const term = search.trim().toLowerCase(); return questions.filter((q) => !term || `${q.content_ar} ${q.content} ${q.author} ${q.products?.name_ar || q.products?.name || ""}`.toLowerCase().includes(term)); }, [questions, search]);
  return <div className="space-y-4" dir="rtl"><AdminPageHeader category="العمليات" title="أسئلة المنتجات" description="الرد على أسئلة العملاء المرتبطة بصفحات المنتجات" /><div className="rounded-[14px] border border-[#E5E9EF] bg-white p-3"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA1AA]" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالسؤال أو العميل أو المنتج" className="pr-10" /></div></div>{isLoading ? <div className="py-20 text-center text-sm text-muted-foreground">جاري التحميل...</div> : filtered.length === 0 ? <div className="rounded-[14px] border border-[#E5E9EF] bg-white py-20 text-center"><MessageCircleQuestion className="mx-auto h-7 w-7 text-[#9AA1AA]" /><p className="mt-3 text-sm text-muted-foreground">لا توجد أسئلة</p></div> : <div className="space-y-3">{filtered.map((q) => { const value = drafts[q.id] ?? q.answer_ar ?? q.answer ?? ""; return <article key={q.id} className="rounded-[14px] border border-[#E5E9EF] bg-white p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-[#404852]">{q.products?.name_ar || q.products?.name || "منتج"}</p><p className="mt-1 text-[10px] text-[#9299A3]">{q.author} · {new Date(q.created_at).toLocaleDateString("ar-YE")}</p></div><button type="button" onClick={() => remove.mutate(q.id)} className="text-[#C96B72]"><Trash2 className="h-4 w-4" /></button></div><p className="mt-4 rounded-[10px] bg-[#F8FAFC] p-3 text-xs leading-6 text-[#535B65]">{q.content_ar || q.content}</p><Textarea value={value} onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))} placeholder="اكتب رد فلامنجو..." className="mt-3 min-h-[90px]" /><div className="mt-3 flex justify-end"><Button disabled={save.isPending} onClick={() => save.mutate({ id: q.id, answer: value })}>حفظ الرد</Button></div></article>; })}</div>}</div>;
};

export default AdminProductQuestionsPage;
