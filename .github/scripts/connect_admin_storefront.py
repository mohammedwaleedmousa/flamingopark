from pathlib import Path
import re


def write(path: str, content: str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected fragment not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


def regex_once(path: str, pattern: str, replacement: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Expected regex replacement once in {path}, got {count}: {pattern[:120]!r}")
    p.write_text(next_text, encoding="utf-8")


write("src/components/HomeManagedSections.tsx", '''import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

type ManagedSection = { id: string; title: string; title_ar: string; filter_type: string | null; max_products: number | null; show_view_all: boolean | null; view_all_link: string | null; sort_order: number | null };
type ProductRow = Record<string, any> & { section_ids?: string[] | null; created_at?: string | null; sort_order?: number | null };

const HomeManagedSections = () => {
  const { data: sections = [] } = useQuery({ queryKey: ["home-managed-sections"], queryFn: async () => { const { data, error } = await supabase.from("homepage_sections").select("id,title,title_ar,filter_type,max_products,show_view_all,view_all_link,sort_order").eq("is_active", true).order("sort_order", { ascending: true }); if (error) throw error; return (data || []) as ManagedSection[]; }, staleTime: 60_000, refetchOnWindowFocus: false });
  const { data: rows = [] } = useQuery({ queryKey: ["home-managed-section-products"], enabled: sections.length > 0, queryFn: async () => { const { data, error } = await (supabase as any).from("products").select(`${PRODUCT_CARD_SELECT},section_ids,created_at,sort_order`).eq("is_active", true).limit(120); if (error) throw error; return (data || []) as ProductRow[]; }, staleTime: 60_000, refetchOnWindowFocus: false });

  const rendered = useMemo(() => sections.map((section) => {
    const explicit = rows.filter((row) => Array.isArray(row.section_ids) && row.section_ids.includes(section.id));
    let source = explicit.length ? explicit : rows.filter((row) => {
      if (section.filter_type === "featured") return Boolean(row.is_featured);
      if (section.filter_type === "best_seller") return Boolean(row.is_best_seller);
      if (section.filter_type === "discounted") return Number(row.discount || 0) > 0;
      return true;
    });
    if (section.filter_type === "new") source = [...source].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    else source = [...source].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    return { section, products: source.slice(0, Math.max(1, Number(section.max_products || 8))).map((row) => mapProductCard(row as any)) };
  }), [rows, sections]);

  if (!sections.length) return null;

  return <>{rendered.map(({ section, products }) => products.length > 0 ? <section key={section.id} className="bg-background py-7 md:py-12"><div className="mx-auto w-full max-w-[1400px] px-3 md:px-6"><div className="mb-4 flex items-end justify-between gap-3 md:mb-7"><div className="min-w-0"><div className="mb-1 flex items-center gap-2"><span className="h-[2px] w-4 shrink-0 rounded-full bg-[#D4777D]" /><span className="truncate font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[7px]">{section.title || "FLAMINGO EDIT"}</span></div><h2 className="text-[17px] font-semibold tracking-[-0.025em] text-foreground md:text-[26px]">{section.title_ar}</h2></div>{section.show_view_all !== false && <Link to={section.view_all_link || "/products"} className="flex shrink-0 items-center gap-1 border-b border-border pb-0.5 text-[7px] font-medium text-[#A95B61] transition-opacity active:opacity-60 md:text-[8px]">عرض الكل<ArrowLeft className="h-3 w-3" strokeWidth={1.5} /></Link>}</div><div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-4 md:gap-x-5 md:gap-y-7">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></div></section> : null)}</>;
};

export default HomeManagedSections;
''')

write("src/pages/CampaignPage.tsx", '''import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

type Campaign = { id: string; slug: string; title_ar: string; description_ar: string | null; image_url: string | null; mobile_image_url: string | null; badge_text: string | null; cta_label: string | null; cta_url: string | null; product_ids: string[]; starts_at: string | null; ends_at: string | null };

const CampaignPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: campaign, isLoading } = useQuery({ queryKey: ["campaign", slug], enabled: Boolean(slug), queryFn: async () => { const now = Date.now(); const { data, error } = await (supabase as any).from("campaign_pages").select("id,slug,title_ar,description_ar,image_url,mobile_image_url,badge_text,cta_label,cta_url,product_ids,starts_at,ends_at").eq("slug", slug).eq("is_active", true).maybeSingle(); if (error) throw error; if (!data) return null; if (data.starts_at && new Date(data.starts_at).getTime() > now) return null; if (data.ends_at && new Date(data.ends_at).getTime() < now) return null; return { ...data, product_ids: Array.isArray(data.product_ids) ? data.product_ids : [] } as Campaign; }, staleTime: 60_000 });
  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ["campaign-products", campaign?.id], enabled: Boolean(campaign?.id && campaign.product_ids.length), queryFn: async () => { const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).in("id", campaign!.product_ids).eq("is_active", true); if (error) throw error; const map = new Map((data || []).map((row: any) => [row.id, row])); return campaign!.product_ids.map((id) => map.get(id)).filter(Boolean).map((row) => mapProductCard(row as any)); }, staleTime: 60_000 });
  if (!slug) return <Navigate to="/home" replace />;
  if (!isLoading && !campaign) return <Navigate to="/home" replace />;
  return <div className="min-h-screen bg-[#FFFDFC]" dir="rtl"><Navbar /><CartDrawer /><main className="pb-16 md:pt-24">{isLoading || !campaign ? <div className="min-h-[60vh] animate-pulse bg-muted/40" /> : <><section className="relative min-h-[340px] overflow-hidden bg-[#2E2927] md:min-h-[480px]">{campaign.image_url && <picture>{campaign.mobile_image_url && <source media="(max-width: 767px)" srcSet={campaign.mobile_image_url} />}<img src={campaign.image_url} alt={campaign.title_ar} className="absolute inset-0 h-full w-full object-cover" /></picture>}<div className="absolute inset-0 bg-black/45" /><div className="relative mx-auto flex min-h-[340px] max-w-[1400px] flex-col justify-end px-5 py-10 text-white md:min-h-[480px] md:px-8 md:py-14"><Link to="/home" className="mb-auto inline-flex w-fit items-center gap-1 text-[10px] text-white/80"><ArrowRight className="h-4 w-4" />الرئيسية</Link>{campaign.badge_text && <span className="mb-2 text-[8px] tracking-[0.18em] text-white/75">{campaign.badge_text}</span>}<h1 className="max-w-2xl text-[30px] font-semibold md:text-[48px]">{campaign.title_ar}</h1>{campaign.description_ar && <p className="mt-3 max-w-xl text-[11px] leading-7 text-white/85 md:text-[13px]">{campaign.description_ar}</p>}{campaign.cta_url && <Link to={campaign.cta_url} className="mt-5 inline-flex h-10 w-fit items-center bg-white px-5 text-[9px] font-semibold text-[#3B302E]">{campaign.cta_label || "تسوق الآن"}</Link>}</div></section><section className="mx-auto w-full max-w-[1400px] px-3 py-8 md:px-6 md:py-12"><h2 className="mb-5 text-[18px] font-semibold text-[#403633] md:text-[24px]">منتجات الحملة</h2>{productsLoading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div> : products.length ? <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 md:grid-cols-4 md:gap-5">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="py-16 text-center text-[10px] text-muted-foreground">لا توجد منتجات مرتبطة بهذه الحملة حالياً.</p>}</section></>}</main><Footer /></div>;
};

export default CampaignPage;
''')

write("src/pages/admin/AdminProductQuestionsPage.tsx", '''import { useMemo, useState } from "react";
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
''')

write("src/pages/admin/AdminCustomerExperiencePage.tsx", '''import { useEffect, useState } from "react";
import { Save, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CUSTOMER_EXPERIENCE_SETTING_KEY, customerPageOptions, defaultCustomerExperienceSettings, homeSectionOptions, parseCustomerExperienceSettings, type CustomerExperienceSettings } from "@/lib/customerExperience";

const AdminCustomerExperiencePage = () => {
  const [settings, setSettings] = useState<CustomerExperienceSettings>(defaultCustomerExperienceSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void (async () => { const { data, error } = await supabase.from("site_settings").select("value").eq("key", CUSTOMER_EXPERIENCE_SETTING_KEY).maybeSingle(); if (!error) setSettings(parseCustomerExperienceSettings(data?.value)); setLoading(false); })(); }, []);
  const save = async () => { setSaving(true); const { error } = await supabase.from("site_settings").upsert({ key: CUSTOMER_EXPERIENCE_SETTING_KEY, value: settings as any }, { onConflict: "key" }); setSaving(false); if (error) toast({ title: "تعذر الحفظ", description: error.message, variant: "destructive" }); else toast({ title: "تم حفظ تجربة العميل" }); };
  const togglePage = (id: string, value: boolean) => setSettings((s) => ({ ...s, pages: { ...s.pages, [id]: value } }));
  const toggleSection = (id: string, value: boolean) => setSettings((s) => ({ ...s, homeSections: { ...s.homeSections, [id]: value } }));
  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">جاري التحميل...</div>;
  return <div className="space-y-4" dir="rtl"><AdminPageHeader category="واجهة المتجر" title="تجربة العميل" description="تحكم مركزي في إظهار صفحات العميل وأقسام الصفحة الرئيسية" actions={[{ label: "حفظ التغييرات", icon: Save, onClick: save, variant: "primary" }]} /><section className="rounded-[14px] border border-[#E5E9EF] bg-white p-4"><div className="mb-4 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[#675CBA]" /><h2 className="text-sm font-semibold">صفحات العميل</h2></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{customerPageOptions.map((page) => <div key={page.id} className="flex items-center justify-between rounded-[10px] border border-[#EDF0F3] p-3"><div><p className="text-xs font-semibold">{page.label}</p><p dir="ltr" className="mt-1 text-left text-[9px] text-muted-foreground">{page.path}</p></div><Switch checked={settings.pages[page.id] !== false} onCheckedChange={(v) => togglePage(page.id, v)} /></div>)}</div></section><section className="rounded-[14px] border border-[#E5E9EF] bg-white p-4"><h2 className="mb-4 text-sm font-semibold">أقسام الصفحة الرئيسية</h2><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{homeSectionOptions.map((section) => <div key={section.id} className="flex items-center justify-between rounded-[10px] border border-[#EDF0F3] p-3"><span className="text-xs font-semibold">{section.label}</span><Switch checked={settings.homeSections[section.id] !== false} onCheckedChange={(v) => toggleSection(section.id, v)} /></div>)}</div></section><div className="flex justify-end"><Button disabled={saving} onClick={save}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button></div></div>;
};

export default AdminCustomerExperiencePage;
''')

write("src/pages/SeasonalOffersPage.tsx", '''import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

type Offer = { id: string; title_ar: string; subtitle_ar: string | null; description_ar: string | null; image_url: string | null; mobile_image_url: string | null; badge_text: string | null; cta_label: string | null; cta_url: string | null; discount_percentage: number | null; product_ids: string[] | null; apply_to_all: boolean | null; offer_type: string | null; start_date: string | null; end_date: string | null; sort_order: number | null };

const SeasonalOffersPage = () => {
  const { data: offers = [], isLoading } = useQuery({ queryKey: ["managed-offers"], queryFn: async () => { const { data, error } = await (supabase as any).from("offers").select("id,title_ar,subtitle_ar,description_ar,image_url,mobile_image_url,badge_text,cta_label,cta_url,discount_percentage,product_ids,apply_to_all,offer_type,start_date,end_date,sort_order").eq("is_active", true).order("sort_order", { ascending: true }); if (error) throw error; const now = Date.now(); return (data || []).filter((o: Offer) => (!o.start_date || new Date(o.start_date).getTime() <= now) && (!o.end_date || new Date(o.end_date).getTime() >= now)) as Offer[]; }, staleTime: 60_000 });
  const ids = useMemo(() => Array.from(new Set(offers.flatMap((o) => o.product_ids || []))), [offers]);
  const hasAll = offers.some((o) => o.apply_to_all);
  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ["managed-offer-products", ids.join(","), hasAll], enabled: offers.length > 0, queryFn: async () => { let query: any = supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true); if (!hasAll && ids.length) query = query.in("id", ids); else if (!hasAll && !ids.length) return []; const { data, error } = await query.limit(120); if (error) throw error; const map = new Map((data || []).map((row: any) => [row.id, row])); const ordered = hasAll ? (data || []) : ids.map((id) => map.get(id)).filter(Boolean); return ordered.map((row: any) => mapProductCard(row)); }, staleTime: 60_000 });
  const hero = offers[0];
  const loading = isLoading || productsLoading;
  return <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl"><Navbar /><CartDrawer /><main className="pb-16 md:pt-24">{hero && <section className="relative min-h-[250px] overflow-hidden bg-[#FFF3F1] md:min-h-[360px]">{hero.image_url && <picture>{hero.mobile_image_url && <source media="(max-width: 767px)" srcSet={hero.mobile_image_url} />}<img src={hero.image_url} alt={hero.title_ar} className="absolute inset-0 h-full w-full object-cover" /></picture>}<div className="absolute inset-0 bg-gradient-to-l from-[#FFF8F5]/95 via-[#FFF8F5]/75 to-transparent" /><div className="relative mx-auto flex min-h-[250px] max-w-[1400px] items-center px-5 md:min-h-[360px] md:px-8"><div className="max-w-lg">{hero.badge_text && <span className="text-[7px] tracking-[0.2em] text-[#B86168]">{hero.badge_text}</span>}<h1 className="mt-2 text-[28px] font-semibold text-[#403131] md:text-[42px]">{hero.title_ar}</h1>{hero.subtitle_ar && <p className="mt-2 text-[10px] leading-6 text-[#8C7772] md:text-[12px]">{hero.subtitle_ar}</p>}</div></div></section>}<section className="mx-auto w-full max-w-[1400px] px-3 py-7 md:px-6 md:py-10"><div className="mb-5 flex items-end justify-between"><div><div className="flex items-center gap-2"><span className="h-[2px] w-4 bg-[#D4777D]" /><span className="text-[7px] tracking-[0.2em] text-[#B86168]">FLAMINGO OFFERS</span></div><h2 className="mt-1 text-[19px] font-semibold">العروض المتاحة الآن</h2></div><span className="text-[9px] text-[#B86168]">{products.length} منتج</span></div>{loading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div> : offers.length === 0 ? <div className="flex min-h-[45vh] flex-col items-center justify-center text-center"><Gift className="h-7 w-7 text-[#C76D73]" /><h3 className="mt-4 text-[15px] font-semibold">لا توجد عروض نشطة حالياً</h3><p className="mt-1 text-[9px] text-muted-foreground">أي عرض تنشره من لوحة الإدارة سيظهر هنا تلقائياً.</p></div> : <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 md:grid-cols-4 md:gap-5">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}</section></main><Footer /></div>;
};

export default SeasonalOffersPage;
''')

# Home page: import managed sections, remove the two duplicate product blocks, insert managed sections.
replace_once("src/pages/HomePage.tsx", 'import FlamingoServices from "@/components/FlamingoServices";', 'import FlamingoServices from "@/components/FlamingoServices";\nimport HomeManagedSections from "@/components/HomeManagedSections";')
regex_once("src/pages/HomePage.tsx", r'\n\s*\{showHomeSection\("featuredProducts"\) && \(.*?\n\s*\)\}\n\n\s*/\* =====================================================\n\s*SERVICES', '\n\n        <HomeManagedSections />\n\n        {/* =====================================================\n            SERVICES')
regex_once("src/pages/HomePage.tsx", r'\n\s*/\* =====================================================\n\s*BEST SELLERS.*?\n\s*\)\}\n\n\s*/\* =====================================================\n\s*EDITORIAL', '\n\n        {/* =====================================================\n            EDITORIAL')

# App routes.
replace_once("src/App.tsx", 'const SeasonalOffersPage = lazy(() => import("./pages/SeasonalOffersPage"));', 'const SeasonalOffersPage = lazy(() => import("./pages/SeasonalOffersPage"));\nconst CampaignPage = lazy(() => import("./pages/CampaignPage"));')
replace_once("src/App.tsx", 'const AdminReviewsPage = lazy(() => import("./pages/admin/AdminReviewsPage"));', 'const AdminReviewsPage = lazy(() => import("./pages/admin/AdminReviewsPage"));\nconst AdminProductQuestionsPage = lazy(() => import("./pages/admin/AdminProductQuestionsPage"));')
replace_once("src/App.tsx", 'const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));', 'const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));\nconst AdminCustomerExperiencePage = lazy(() => import("./pages/admin/AdminCustomerExperiencePage"));')
replace_once("src/App.tsx", '<Route path="/seasonal-offers" element={<ProtectedRoute><SeasonalOffersPage /></ProtectedRoute>} />', '<Route path="/seasonal-offers" element={<ProtectedRoute><SeasonalOffersPage /></ProtectedRoute>} />\n            <Route path="/campaign/:slug" element={<ProtectedRoute><CampaignPage /></ProtectedRoute>} />')
replace_once("src/App.tsx", '<Route path="reviews" element={<AdminReviewsPage />} />', '<Route path="reviews" element={<AdminReviewsPage />} />\n              <Route path="product-questions" element={<AdminProductQuestionsPage />} />')
replace_once("src/App.tsx", '<Route path="settings" element={<AdminSettingsPage />} />', '<Route path="settings" element={<AdminSettingsPage />} />\n              <Route path="customer-experience" element={<AdminCustomerExperiencePage />} />')

# Sidebar entries.
replace_once("src/components/admin/AdminSidebar.tsx", '{ title: "أقسام الصفحة الرئيسية", url: "/admin/sections", icon: LayoutGrid, tone: "rose" },', '{ title: "أقسام الصفحة الرئيسية", url: "/admin/sections", icon: LayoutGrid, tone: "rose" },\n      { title: "تجربة العميل", url: "/admin/customer-experience", icon: SlidersHorizontal, tone: "rose" },')
replace_once("src/components/admin/AdminSidebar.tsx", '{ title: "التقييمات", url: "/admin/reviews", icon: Star, tone: "amber" },', '{ title: "التقييمات", url: "/admin/reviews", icon: Star, tone: "amber" },\n      { title: "أسئلة المنتجات", url: "/admin/product-questions", icon: Star, tone: "amber" },')

# Checkout reads the same payment_methods managed by admin.
replace_once("src/pages/CheckoutPage.tsx", 'interface CODRegion {', 'interface PaymentMethod {\n  id: string;\n  code: string;\n  name: string;\n  name_ar: string;\n  type: string;\n}\n\ninterface CODRegion {')
replace_once("src/pages/CheckoutPage.tsx", 'const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank">("cod");', 'const [paymentMethod, setPaymentMethod] = useState("");')
checkout_payment_query = '''  /* =========================================================
     PAYMENT METHODS
  ========================================================= */

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["checkout-payment-methods"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("payment_methods").select("id,code,name,name_ar,type").eq("is_active", true).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as PaymentMethod[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!paymentMethod && paymentMethods.length > 0) setPaymentMethod(paymentMethods[0].code);
    else if (paymentMethod && paymentMethods.length > 0 && !paymentMethods.some((method) => method.code === paymentMethod)) setPaymentMethod(paymentMethods[0].code);
  }, [paymentMethod, paymentMethods]);

'''
replace_once("src/pages/CheckoutPage.tsx", '  /* =========================================================\n     CHECKOUT SETTINGS\n  ========================================================= */', checkout_payment_query + '  /* =========================================================\n     CHECKOUT SETTINGS\n  ========================================================= */')
replace_once("src/pages/CheckoutPage.tsx", '  const total = Math.max(0, subtotal + deliveryFee - discountAmount);', '  const total = Math.max(0, subtotal + deliveryFee - discountAmount);\n  const selectedPaymentMethod = paymentMethods.find((method) => method.code === paymentMethod) || null;\n  const isCashPayment = selectedPaymentMethod?.type === "cash" || selectedPaymentMethod?.code === "cod" || selectedPaymentMethod?.code === "cash";\n  const isBankPayment = selectedPaymentMethod?.type === "bank" || selectedPaymentMethod?.code === "bank";')
replace_once("src/pages/CheckoutPage.tsx", 'if (paymentMethod === "cod" && codRegions.length > 0 && !selectedRegion)', 'if (isCashPayment && codRegions.length > 0 && !selectedRegion)')
replace_once("src/pages/CheckoutPage.tsx", 'selectedRegion: paymentMethod === "cod" && regionData ? regionData.region_name_ar : customer?.region || null,', 'selectedRegion: isCashPayment && regionData ? regionData.region_name_ar : customer?.region || null,')
payment_ui = '''                    {/* PAYMENT METHOD */}

                    <div className="mt-5">
                      <p className="mb-2.5 text-[8px] font-semibold text-[#574A45]">طريقة الدفع *</p>

                      {paymentMethods.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {paymentMethods.map((method) => {
                            const active = paymentMethod === method.code;
                            const Icon = method.type === "cash" ? Banknote : CreditCard;
                            return <button key={method.id} type="button" onClick={() => setPaymentMethod(method.code)} className={`relative flex min-h-[72px] flex-col items-start justify-center rounded-[11px] border p-3 text-right ${active ? "border-[#D9A7A4] bg-[#FFF7F5]" : "border-[#E7DDD9] bg-white"}`}><Icon className={`h-4 w-4 ${active ? "text-[#C66C72]" : "text-[#8E817C]"}`} strokeWidth={1.5} /><p className="mt-2 text-[8px] font-semibold text-[#514540]">{method.name_ar || method.name}</p><p className="mt-0.5 text-[6px] text-[#A0938E]">{method.name}</p>{active && <span className="absolute left-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4777D]"><Check className="h-2.5 w-2.5 text-white" /></span>}</button>;
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[10px] bg-[#F8F5F3] px-3 py-3 text-[7px] text-[#887A75]">لا توجد طرق دفع مفعلة من لوحة الإدارة.</div>
                      )}
                    </div>

                    {/* COD REGION */}'''
regex_once("src/pages/CheckoutPage.tsx", r'\s*\{\/\* PAYMENT METHOD \*\/\}.*?\{\/\* COD REGION \*\/\}', '\n\n' + payment_ui)
replace_once("src/pages/CheckoutPage.tsx", '{paymentMethod === "cod" && codRegions.length > 0 && !customer?.region && (', '{isCashPayment && codRegions.length > 0 && !customer?.region && (')
replace_once("src/pages/CheckoutPage.tsx", '{paymentMethod === "bank" && bankAccounts.length > 0 && (', '{isBankPayment && bankAccounts.length > 0 && (')
replace_once("src/pages/CheckoutPage.tsx", '{paymentMethod === "cod" ? "الدفع عند الاستلام" : "تحويل بنكي"}', '{selectedPaymentMethod?.name_ar || selectedPaymentMethod?.name || paymentMethod || "—"}')

write("supabase/migrations/20260817130000_connect_admin_storefront.sql", '''-- Connect checkout validation to payment methods managed by the admin dashboard.
do $$
declare
  ddl text;
  old_fragment text := 'if p_payment_method not in (''cod'',''bank'') then raise exception ''invalid_payment_method''; end if;';
  new_fragment text := 'if not exists (select 1 from public.payment_methods pm where pm.is_active = true and (pm.code = p_payment_method or (p_payment_method = ''cod'' and pm.type = ''cash''))) then raise exception ''invalid_payment_method''; end if;';
begin
  select pg_get_functiondef('public.create_secure_order_v2(text,text,text,text,text,text,text,jsonb,text,text,text,text,uuid)'::regprocedure) into ddl;
  if position(old_fragment in ddl) = 0 then
    raise exception 'create_secure_order_v2 payment validation fragment not found';
  end if;
  ddl := replace(ddl, old_fragment, new_fragment);
  execute ddl;
end $$;
''')

print("storefront-admin integration patch applied")
